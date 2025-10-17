import "server-only";
import { surrealConfig } from "./config";
import type { LiveQueryEvent } from "./types";

// Import WebSocket for Node.js environment
const WebSocket = require("ws");

export class SurrealWebSocketClient {
	private ws: WebSocket | null = null;
	private wsUrl: string;
	private namespace: string;
	private database: string;
	private username: string | null = null;
	private password: string | null = null;
	private token: string | null = null;
	private isConnected = false;
	private liveQueryCallbacks: Map<string, (data: LiveQueryEvent) => void> =
		new Map();
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;

	constructor() {
		if (!surrealConfig.url) {
			throw new Error("SURREAL_URL not configured");
		}

		this.namespace = surrealConfig.namespace || "arcados-bot";
		this.database = surrealConfig.database || "arcados-bot";
		this.username = surrealConfig.username || null;
		this.password = surrealConfig.password || null;
		this.token = surrealConfig.token || null;

		// Convert HTTP URL to WebSocket RPC URL
		this.wsUrl = this.convertToWebSocketUrl(surrealConfig.url);
	}

	private convertToWebSocketUrl(url: string): string {
		// Handle both HTTP and WebSocket URLs
		const parsedUrl = new URL(url);

		if (parsedUrl.protocol === "https:") {
			// Convert https://instance.surrealdb.com to wss://instance.surrealdb.com/rpc
			return `wss://${parsedUrl.host}/rpc`;
		} else if (parsedUrl.protocol === "http:") {
			// Convert http://instance.surrealdb.com to ws://instance.surrealdb.com/rpc
			return `ws://${parsedUrl.host}/rpc`;
		} else if (parsedUrl.protocol === "wss:") {
			// Already a WebSocket URL, just ensure it has /rpc path
			if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
				return `wss://${parsedUrl.host}/rpc`;
			}
			return url; // Keep as-is if it already has a path
		} else if (parsedUrl.protocol === "ws:") {
			// Already a WebSocket URL, just ensure it has /rpc path
			if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
				return `ws://${parsedUrl.host}/rpc`;
			}
			return url; // Keep as-is if it already has a path
		}

		throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
	}

	async connect(): Promise<void> {
		if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		return new Promise((resolve, reject) => {
			console.log("🔹 Connecting to SurrealDB WebSocket...");
			console.log("🔹 URL:", this.wsUrl);
			console.log("🔹 Namespace:", this.namespace);
			console.log("🔹 Database:", this.database);

			if (this.wsUrl) {
				this.ws = new WebSocket(this.wsUrl);
			} else {
				throw new Error("SURREAL_URL not configured");
			}

			if (this.ws) {
				this.ws.onopen = async () => {
					console.log("🔹 WebSocket connection opened");

					try {
						// Wait a brief moment to ensure WebSocket is fully ready
						await new Promise((resolve) => setTimeout(resolve, 200));

						console.log("🔹 Setting namespace and database...");
						// Set namespace and database first
						await this.use(this.namespace, this.database);
						console.log("🔹 Namespace and database set successfully");

						// Authenticate
						if (this.token) {
							console.log("🔹 Authenticating with token...");
							await this.authenticate(this.token);
						} else if (this.username && this.password) {
							console.log("🔹 Authenticating with username/password...");
							await this.signin(this.username, this.password);
						} else {
							throw new Error("No authentication credentials provided");
						}
						console.log("🔹 Authentication successful");

						this.isConnected = true;
						this.reconnectAttempts = 0;
						console.log("🔹 Connected to SurrealDB WebSocket successfully");
						resolve();
					} catch (error) {
						console.error("🔸 Authentication failed:", error);
						reject(error);
					}
				};

				this.ws.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						this.handleMessage(data);
					} catch (error) {
						console.error("🔸 Error parsing WebSocket message:", error);
					}
				};

				this.ws.onclose = (event) => {
					console.log(
						"🔸 WebSocket connection closed:",
						event.code,
						event.reason,
					);
					this.isConnected = false;

					// Attempt reconnection if not a clean close
					if (
						event.code !== 1000 &&
						this.reconnectAttempts < this.maxReconnectAttempts
					) {
						this.reconnectAttempts++;
						const delay =
							this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);
						console.log(
							`🔹 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
						);

						setTimeout(() => {
							this.connect().catch(console.error);
						}, delay);
					}
				};

				this.ws.onerror = (error) => {
					console.error("🔸 WebSocket connection error:", error);
					reject(error);
				};
			}
		});
	}

	private async use(namespace: string, database: string): Promise<void> {
		console.log("🔹 Setting namespace and database");

		const message = {
			id: "use",
			method: "use",
			params: [namespace, database],
		};

		await this.sendMessage(message);
	}

	private async authenticate(token: string): Promise<void> {
		this.token = token;
		console.log("🔹 Using token-based authentication");

		const message = {
			id: "auth",
			method: "authenticate",
			params: [token],
		};

		await this.sendMessage(message);
	}

	private async signin(username: string, password: string): Promise<void> {
		this.username = username;
		this.password = password;
		console.log("🔹 Using username/password authentication");

		const message = {
			id: "signin",
			method: "signin",
			params: [
				{
					user: username,
					pass: password,
				},
			],
		};

		await this.sendMessage(message);
	}

	private async sendMessage(
		message: Record<string, unknown>,
	): Promise<unknown> {
		// Wait for WebSocket to be ready
		let attempts = 0;
		while (
			(!this.ws || this.ws.readyState !== WebSocket.OPEN) &&
			attempts < 20
		) {
			await new Promise((resolve) => setTimeout(resolve, 100));
			attempts++;
		}

		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error("WebSocket not connected");
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Request timeout"));
			}, 30000); // Increased timeout to 30 seconds

			const originalOnMessage = this.ws?.onmessage || null;
			if (this.ws) {
				this.ws.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						console.log("🔹 WebSocket response:", data);

						if (data.id === message.id) {
							clearTimeout(timeout);
							if (this.ws) {
								this.ws.onmessage = originalOnMessage;
							}

							if (data.error) {
								console.error("🔸 WebSocket error response:", data.error);
								reject(new Error(data.error.message || "Unknown error"));
							} else {
								console.log("🔹 WebSocket success response:", data.result);
								resolve(data.result);
							}
						}
					} catch (error) {
						clearTimeout(timeout);
						if (this.ws) {
							this.ws.onmessage = originalOnMessage;
						}
						reject(error);
					}
				};
			}

			console.log("🔹 Sending WebSocket message:", message);
			if (this.ws) {
				this.ws.send(JSON.stringify(message));
			}
		});
	}

	private handleMessage(data: Record<string, unknown>): void {
		// Handle live query notifications
		if (data.method === "notify" && Array.isArray(data.params)) {
			const [queryId, result] = data.params;
			const callback = this.liveQueryCallbacks.get(queryId as string);

			if (callback) {
				// Transform SurrealDB notification to our LiveQueryEvent format
				const liveQueryEvent: LiveQueryEvent = {
					action:
						((result as Record<string, unknown>)?.action as
							| "CREATE"
							| "UPDATE"
							| "DELETE") || "UPDATE",
					result: (result as Record<string, unknown>)?.result || result,
				};

				callback(liveQueryEvent);
			}
		}
	}

	async live(
		query: string,
		params: Record<string, unknown> = {},
	): Promise<string> {
		await this.connect();

		const queryId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const message = {
			id: queryId,
			method: "live",
			params: [query, params],
		};

		await this.sendMessage(message);
		return queryId;
	}

	async kill(liveQueryId: string): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			return;
		}

		const message = {
			id: `kill_${Date.now()}`,
			method: "kill",
			params: [liveQueryId],
		};

		await this.sendMessage(message);
		this.liveQueryCallbacks.delete(liveQueryId);
	}

	onLiveQuery(queryId: string, callback: (data: LiveQueryEvent) => void): void {
		this.liveQueryCallbacks.set(queryId, callback);
	}

	offLiveQuery(queryId: string): void {
		this.liveQueryCallbacks.delete(queryId);
	}

	async close(): Promise<void> {
		if (this.ws) {
			this.ws.close(1000, "Client closing");
			this.ws = null;
		}
		this.isConnected = false;
		this.liveQueryCallbacks.clear();
		console.log("🔹 SurrealDB WebSocket client closed");
	}
}
