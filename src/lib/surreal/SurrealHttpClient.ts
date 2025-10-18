"use client";

export interface SurrealHttpResponse<T = unknown> {
	result: T[];
	status: string;
	time: string;
}

export interface SurrealHttpError {
	code: number;
	details: string;
	description: string;
	information: string;
}

export interface SurrealHttpClientOptions {
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
}

export class SurrealHttpClient {
	private baseUrl: string;
	private namespace: string;
	private database: string;
	private username: string | null = null;
	private password: string | null = null;
	private token: string | null = null;
	private isConnected = false;
	private connectionRetries = 0;
	private maxRetries = 5;
	private timeout = 10000; // 10 seconds
	private options: SurrealHttpClientOptions;

	constructor(options: SurrealHttpClientOptions = {}) {
		this.options = options;

		// Use public environment variables for client-side
		const surrealUrl = process.env.NEXT_PUBLIC_SURREAL_URL;
		if (!surrealUrl) {
			throw new Error("NEXT_PUBLIC_SURREAL_URL not configured");
		}

		this.namespace = process.env.NEXT_PUBLIC_SURREAL_NAMESPACE || "arcados-bot";
		this.database = process.env.NEXT_PUBLIC_SURREAL_DATABASE || "arcados-bot";
		this.username = process.env.NEXT_PUBLIC_SURREAL_USERNAME || "root";
		this.password = process.env.NEXT_PUBLIC_SURREAL_PASSWORD || "root";
		this.token = process.env.NEXT_PUBLIC_SURREAL_TOKEN || null;

		// Convert WebSocket URL to HTTP URL (same logic as backend)
		this.baseUrl = surrealUrl
			.replace("wss://", "https://")
			.replace("ws://", "http://")
			.replace("/rpc", "/sql");
	}

	async connect(): Promise<void> {
		if (this.isConnected) {
			return;
		}

		console.log("🔹 Connecting to SurrealDB via HTTP REST API...");
		console.log("🔹 URL:", this.baseUrl);
		console.log("🔹 Namespace:", this.namespace);
		console.log("🔹 Database:", this.database);

		try {
			// First, set the namespace and database
			console.log("🔹 Setting namespace and database...");
			await this.executeQuery(
				`USE NS "${this.namespace}" DB "${this.database}";`,
			);

			// Test connection with a simple query
			await this.executeQuery("SELECT * FROM users LIMIT 1");

			this.isConnected = true;
			this.connectionRetries = 0;
			console.log("🔹 Connected to SurrealDB successfully");

			if (this.options.onConnect) {
				this.options.onConnect();
			}
		} catch (error) {
			console.error("🔸 SurrealDB connection failed:", error);
			this.handleConnectionError(error as Error);
		}
	}

	private async handleConnectionError(error: Error): Promise<void> {
		if (this.connectionRetries < this.maxRetries) {
			this.connectionRetries++;
			const delay = Math.min(1000 * 2 ** (this.connectionRetries - 1), 30000);

			console.log(
				`🔹 Retrying connection in ${delay}ms (attempt ${this.connectionRetries}/${this.maxRetries})`,
			);

			setTimeout(() => {
				this.connect().catch(console.error);
			}, delay);
		} else {
			console.error("🔸 Max connection retries reached");
			if (this.options.onError) {
				this.options.onError(error);
			}
		}
	}

	private getAuthHeaders(): HeadersInit {
		const headers: HeadersInit = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		// Set namespace and database
		headers["NS"] = this.namespace;
		headers["DB"] = this.database;

		// Authentication (same logic as backend)
		if (this.token) {
			headers["Authorization"] = `Bearer ${this.token}`;
		} else if (this.username && this.password) {
			const credentials = btoa(`${this.username}:${this.password}`);
			headers["Authorization"] = `Basic ${credentials}`;
		}

		return headers;
	}

	async executeQuery<T = unknown>(
		query: string,
		params: Record<string, unknown> = {},
	): Promise<T[]> {
		// Use POST to /sql endpoint with query in body
		const url = `${this.baseUrl}/sql`;
		const body = query; // SurrealDB expects the query as plain text in the body

		console.log("🔹 Executing SurrealDB query:", { query, params });

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await fetch(url, {
				method: "POST",
				headers: {
					...this.getAuthHeaders(),
					"Content-Type": "text/plain", // SurrealDB expects plain text for queries
				},
				body,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}

			const result: SurrealHttpResponse<T> = await response.json();

			// Handle SurrealDB error responses
			if (Array.isArray(result)) {
				const firstResult = result[0];
				if (firstResult && firstResult.status === "ERR") {
					throw new Error(`SurrealDB Error: ${firstResult.result}`);
				}
				// Return the result array directly
				return result as T[];
			}

			if (result.status === "ERR") {
				throw new Error(`SurrealDB Error: ${result.result}`);
			}

			console.log("🔹 Query executed successfully:", result.result);
			return result.result;
		} catch (error) {
			console.error("🔸 SurrealDB query error:", error);

			// Handle connection errors
			if (
				error instanceof Error &&
				(error.name === "AbortError" ||
					error.message.includes("fetch") ||
					error.message.includes("network"))
			) {
				this.isConnected = false;
				this.handleConnectionError(error);
			}

			throw error;
		}
	}

	// Live query simulation using polling (since we can't use WebSocket)
	private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

	async startLiveQuery<T = unknown>(
		query: string,
		params: Record<string, unknown> = {},
		callback: (data: T[]) => void,
		intervalMs: number = 1000,
	): Promise<string> {
		const queryId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		console.log(`🔹 Starting live query polling: ${queryId}`);

		const poll = async () => {
			try {
				const result = await this.executeQuery<T>(query, params);
				callback(result);
			} catch (error) {
				console.error(`🔸 Live query ${queryId} error:`, error);
			}
		};

		// Initial poll
		await poll();

		// Set up polling interval
		const interval = setInterval(poll, intervalMs);
		this.pollingIntervals.set(queryId, interval);

		return queryId;
	}

	async stopLiveQuery(queryId: string): Promise<void> {
		const interval = this.pollingIntervals.get(queryId);
		if (interval) {
			clearInterval(interval);
			this.pollingIntervals.delete(queryId);
			console.log(`🔹 Stopped live query polling: ${queryId}`);
		}
	}

	async disconnect(): Promise<void> {
		// Clear all polling intervals
		for (const [queryId, interval] of this.pollingIntervals) {
			clearInterval(interval);
			console.log(`🔹 Stopped live query polling: ${queryId}`);
		}
		this.pollingIntervals.clear();

		this.isConnected = false;
		console.log("🔹 Disconnected from SurrealDB");
	}

	// Convenience methods for common queries
	async subscribeToGuildChannels(
		guildId: string,
		callback: (data: unknown[]) => void,
		intervalMs: number = 2000,
	): Promise<string> {
		const query = `
			SELECT * FROM channels 
			WHERE guildId = $guildId AND isActive = true
		`;

		return this.startLiveQuery(query, { guildId }, callback, intervalMs);
	}

	async subscribeToAllVoiceSessions(
		callback: (data: unknown[]) => void,
		intervalMs: number = 2000,
	): Promise<string> {
		const query = `
			SELECT * FROM voice_channel_sessions 
			WHERE is_active = true
		`;

		return this.startLiveQuery(query, {}, callback, intervalMs);
	}
}
