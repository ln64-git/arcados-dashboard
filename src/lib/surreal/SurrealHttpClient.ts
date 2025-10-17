import "server-only";
import { surrealConfig } from "./config";
import type { LiveQueryEvent } from "./types";

export class SurrealHttpClient {
	private baseUrl: string;
	private token: string | null = null;
	private username: string | null = null;
	private password: string | null = null;
	private namespace: string;
	private database: string;
	private isConnected = false;

	constructor() {
		if (!surrealConfig.url) {
			throw new Error("SURREAL_URL not configured");
		}

		// Convert WebSocket URL to HTTP URL (like the bot does)
		this.baseUrl = surrealConfig.url
			.replace("wss://", "https://")
			.replace("ws://", "http://")
			.replace("/rpc", "/sql");

		this.namespace = surrealConfig.namespace || "arcados-bot";
		this.database = surrealConfig.database || "arcados-bot";
		this.username = surrealConfig.username || null;
		this.password = surrealConfig.password || null;
		this.token = surrealConfig.token || null;
	}

	async connect(): Promise<void> {
		if (this.isConnected) {
			return;
		}

		console.log("🔹 Connecting to SurrealDB Cloud...");
		console.log("🔹 URL:", this.baseUrl);
		console.log("🔹 Namespace:", this.namespace);
		console.log("🔹 Database:", this.database);

		// Authenticate if we have credentials
		if (surrealConfig.token) {
			await this.authenticate(surrealConfig.token);
		} else if (surrealConfig.username && surrealConfig.password) {
			await this.signin(surrealConfig.username, surrealConfig.password);
		} else {
			throw new Error("No authentication credentials provided");
		}

		this.isConnected = true;
		console.log("🔹 Connected to SurrealDB successfully");
	}

	async authenticate(token: string): Promise<void> {
		this.token = token;
		console.log("🔹 Using token-based authentication");
		// Test the connection with a simple query
		try {
			await this.query("SELECT * FROM users LIMIT 1");
		} catch (error) {
			console.error("🔸 Authentication test failed:", error);
			throw error;
		}
	}

	async signin(username: string, password: string): Promise<void> {
		// Store credentials for HTTP Basic Auth
		this.username = username;
		this.password = password;
		console.log("🔹 Using basic authentication with username:", username);

		// Test the connection with a simple query
		try {
			await this.query("SELECT * FROM users LIMIT 1");
		} catch (error) {
			console.error("🔸 Authentication test failed:", error);
			throw error;
		}
	}

	async query<T = unknown>(
		query: string,
		params?: Record<string, unknown>,
	): Promise<T[]> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
			"Surreal-NS": this.namespace,
			"Surreal-DB": this.database,
		};

		// Use HTTP Basic Auth if username/password are available
		if (this.username && this.password) {
			const credentials = Buffer.from(
				`${this.username}:${this.password}`,
			).toString("base64");
			headers["Authorization"] = `Basic ${credentials}`;
		} else if (this.token) {
			headers["Authorization"] = `Bearer ${this.token}`;
		}

		// Replace parameters in query if provided
		let processedQuery = query;
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				processedQuery = processedQuery.replace(
					new RegExp(`\\$${key}\\b`, "g"),
					JSON.stringify(value),
				);
			}
		}

		const response = await fetch(`${this.baseUrl}/sql`, {
			method: "POST",
			headers: {
				...headers,
				"Content-Type": "text/plain",
			},
			body: processedQuery,
		});

		console.log("🔹 Request URL:", `${this.baseUrl}/sql`);
		console.log("🔹 Request headers:", JSON.stringify(headers, null, 2));
		console.log("🔹 Request body:", processedQuery);
		console.log("🔹 Response status:", response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`🔸 SurrealDB query failed: ${response.statusText}`,
				errorText,
			);
			throw new Error(`Query failed: ${response.statusText} - ${errorText}`);
		}

		const result = await response.json();

		// Check for query-level errors in SurrealDB response
		if (result[0]?.status === "ERR") {
			const error = result[0].detail || result[0].result || "Unknown error";
			console.error("🔸 SurrealDB query error:", error);
			throw new Error(`Query error: ${error}`);
		}

		// Extract results from SurrealDB response format
		if (Array.isArray(result) && result.length > 0) {
			return result[0].result || [];
		}

		return [];
	}

	// Note: Live queries require WebSocket connection
	// For now, we'll implement a placeholder that throws an error
	// This will be implemented later when we add WebSocket support for live queries
	async live(
		query: string,
		params: Record<string, unknown> = {},
	): Promise<string> {
		throw new Error(
			"Live queries not yet implemented with HTTP client. Use WebSocket client for live queries.",
		);
	}

	async kill(liveQueryId: string): Promise<void> {
		throw new Error(
			"Kill live query not yet implemented with HTTP client. Use WebSocket client for live queries.",
		);
	}

	onLiveQuery(queryId: string, callback: (data: LiveQueryEvent) => void): void {
		throw new Error(
			"Live query callbacks not yet implemented with HTTP client. Use WebSocket client for live queries.",
		);
	}

	offLiveQuery(queryId: string): void {
		throw new Error(
			"Live query callbacks not yet implemented with HTTP client. Use WebSocket client for live queries.",
		);
	}

	async close(): Promise<void> {
		this.isConnected = false;
		this.token = null;
		this.username = null;
		this.password = null;
		console.log("🔹 SurrealDB HTTP client closed");
	}
}
