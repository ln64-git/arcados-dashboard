import "server-only";
import { surrealConfig } from "./config";

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

export class SurrealHttpClientServer {
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

	constructor() {
		if (!surrealConfig.url) {
			throw new Error("SURREAL_URL not configured");
		}

		this.namespace = surrealConfig.namespace || "arcados-bot";
		this.database = surrealConfig.database || "arcados-bot";
		this.username = surrealConfig.username || "root";
		this.password = surrealConfig.password || "root";
		this.token = surrealConfig.token || null;

		// Convert WebSocket URL to HTTP URL
		this.baseUrl = surrealConfig.url
			.replace("wss://", "https://")
			.replace("ws://", "http://")
			.replace("/rpc", "");
	}

	async connect(): Promise<void> {
		if (this.isConnected) {
			return;
		}

		console.log("🔹 Connecting to SurrealDB via HTTP REST API (server)...");
		console.log("🔹 URL:", this.baseUrl);
		console.log("🔹 Namespace:", this.namespace);
		console.log("🔹 Database:", this.database);
		console.log("🔹 Username:", this.username);
		console.log("🔹 Has Password:", !!this.password);
		console.log("🔹 Has Token:", !!this.token);

		try {
			// Test connection with a simple query that includes namespace/database
			const testQuery = `USE NAMESPACE ${this.namespace}; USE DATABASE ${this.database}; INFO FOR DB;`;
			console.log("🔹 Test query:", testQuery);

			const result = await this.executeQuery(testQuery);
			console.log("🔹 Connection test result:", result);

			this.isConnected = true;
			this.connectionRetries = 0;
			console.log("🔹 Connected to SurrealDB successfully (server)");
		} catch (error) {
			console.error("🔸 SurrealDB connection failed (server):", error);
			console.error("🔸 Error details:", {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				url: this.baseUrl,
				namespace: this.namespace,
				database: this.database,
			});
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
			console.error("🔸 Max connection retries reached (server)");
			throw error;
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
			const credentials = Buffer.from(
				`${this.username}:${this.password}`,
			).toString("base64");
			headers["Authorization"] = `Basic ${credentials}`;
		}

		return headers;
	}

	async executeQuery<T = unknown>(
		query: string,
		params: Record<string, unknown> = {},
	): Promise<T[]> {
		// Use POST to /sql endpoint with query in JSON body
		const url = `${this.baseUrl}/sql`;
		const body = JSON.stringify({ query, params });

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await fetch(url, {
				method: "POST",
				headers: {
					...this.getAuthHeaders(),
					"Content-Type": "application/json",
				},
				body,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("🔸 HTTP Error Response:", errorText);
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}

			const result: SurrealHttpResponse<T> = await response.json();
			console.log("🔹 Raw HTTP response:", JSON.stringify(result, null, 2));

			// Handle SurrealDB error responses
			if (Array.isArray(result)) {
				const firstResult = result[0];
				if (firstResult && firstResult.status === "ERR") {
					throw new Error(`SurrealDB Error: ${firstResult.result}`);
				}
				// Extract the actual data from the response array
				const data = result.map((r) => r.result).filter((r) => r !== null);
				console.log("🔹 Extracted data:", data);
				return data as T[];
			}

			if (result.status === "ERR") {
				throw new Error(`SurrealDB Error: ${result.result}`);
			}

			console.log("🔹 Query executed successfully (server):", result.result);
			return result.result;
		} catch (error) {
			console.error("🔸 SurrealDB query error (server):", error);
			console.error("🔸 Error type:", typeof error);
			console.error(
				"🔸 Error name:",
				error instanceof Error ? error.name : "Unknown",
			);
			console.error(
				"🔸 Error message:",
				error instanceof Error ? error.message : String(error),
			);

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

	async disconnect(): Promise<void> {
		this.isConnected = false;
		console.log("🔹 Disconnected from SurrealDB (server)");
	}
}
