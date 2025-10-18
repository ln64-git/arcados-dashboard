import { surrealConfig } from "./config";
import type { LiveQueryEvent } from "./types";

// Environment detection for WebSocket implementation
const isServer = typeof window === "undefined";
const WebSocket = isServer ? require("ws") : window.WebSocket;

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
	private reconnectTimer: NodeJS.Timeout | null = null;
	private queryResultCache: Map<string, { data: unknown; timestamp: number }> =
		new Map();
	private cacheTimeout = 5000; // 5 seconds cache timeout
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private heartbeatDelay = 30000; // 30 seconds

	constructor() {
		console.log("🔹 SurrealWebSocketClient constructor called");
		if (!surrealConfig.url) {
			console.error("🔸 SURREAL_URL not configured");
			throw new Error("SURREAL_URL not configured");
		}

		this.namespace = surrealConfig.namespace || "arcados-bot";
		this.database = surrealConfig.database || "arcados-bot";
		this.username = surrealConfig.username || null;
		this.password = surrealConfig.password || null;
		this.token = surrealConfig.token || null;

		// Convert HTTP URL to WebSocket RPC URL
		this.wsUrl = this.convertToWebSocketUrl(surrealConfig.url);
		console.log("🔹 WebSocket client initialized with URL:", this.wsUrl);
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
			console.log("🔹 WebSocket already connected");
			return;
		}


		return new Promise((resolve, reject) => {
			console.log("🔹 Creating WebSocket connection...");

			if (this.wsUrl) {
				this.ws = new WebSocket(this.wsUrl);
			} else {
				reject(new Error("SURREAL_URL not configured"));
				return;
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
						this.startHeartbeat();
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
					this.stopHeartbeat();

					// Attempt reconnection if not a clean close
					if (
						event.code !== 1000 &&
						this.reconnectAttempts < this.maxReconnectAttempts
					) {
						this.scheduleReconnect();
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
				console.error("🔸 Request timeout for message:", message.id);
				reject(new Error("Request timeout"));
			}, 10000); // Reduced timeout to 10 seconds

			// Store the original message handler
			const originalHandler = this.ws?.onmessage;

			// Create a temporary message handler that handles both responses and live queries
			const tempHandler = (event: MessageEvent) => {
				try {
					const data = JSON.parse(event.data);
					console.log("🔹 WebSocket response:", data);

					// Handle live query notifications
					if (data.method === "notify" && Array.isArray(data.params)) {
						const [queryId, result] = data.params;
						console.log("🔹 Notify event for query:", queryId);
						console.log(
							"🔹 Registered callbacks:",
							Array.from(this.liveQueryCallbacks.keys()),
						);
						const callback = this.liveQueryCallbacks.get(queryId as string);

						if (callback) {
							console.log("🔹 Callback found, executing...");
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
							console.log("🔹 Callback executed successfully");
						} else {
							console.log("🔸 No callback registered for query:", queryId);
						}
					}

					// Handle direct responses
					if (data.id === message.id) {
						clearTimeout(timeout);
						// Restore the original handler
						if (this.ws) {
							this.ws.onmessage = originalHandler;
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
					console.error("🔸 Error parsing WebSocket response:", error);
					clearTimeout(timeout);
					if (this.ws) {
						this.ws.onmessage = originalHandler;
					}
					reject(error);
				}
			};

			// Replace the message handler temporarily
			if (this.ws) {
				this.ws.onmessage = tempHandler;
			}

			console.log("🔹 Sending WebSocket message:", message);
			if (this.ws) {
				this.ws.send(JSON.stringify(message));
			}
		});
	}

	private handleMessage(data: Record<string, unknown>): void {
		console.log(
			"🔹 WebSocket message received:",
			JSON.stringify(data).substring(0, 200),
		);

		// Handle live query notifications
		if (data.method === "notify" && Array.isArray(data.params)) {
			const [queryId, result] = data.params;
			console.log("🔹 Notify event for query:", queryId);
			console.log(
				"🔹 Registered callbacks:",
				Array.from(this.liveQueryCallbacks.keys()),
			);
			const callback = this.liveQueryCallbacks.get(queryId as string);

			if (callback) {
				console.log("🔹 Callback found, executing...");
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
				console.log("🔹 Callback executed successfully");
			} else {
				console.log("🔸 No callback registered for query:", queryId);
			}
		}
	}

	async live(
		query: string,
		params: Record<string, unknown> = {},
	): Promise<string> {
		console.log("🔹 Creating live query:", query, params);
		await this.connect();

		const queryId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const message = {
			id: queryId,
			method: "live",
			params: [query, params],
		};

		console.log("🔹 Sending live query message:", message);
		await this.sendMessage(message);
		console.log("🔹 Live query created with ID:", queryId);
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

	private scheduleReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectAttempts++;
		const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);
		console.log(
			`🔹 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
		);

		this.reconnectTimer = setTimeout(() => {
			this.connect().catch(console.error);
		}, delay);
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatInterval = setInterval(() => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.ws.ping?.() || this.ws.send(JSON.stringify({ method: "ping" }));
			}
		}, this.heartbeatDelay);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	async close(): Promise<void> {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.stopHeartbeat();

		if (this.ws) {
			this.ws.close(1000, "Client closing");
			this.ws = null;
		}
		this.isConnected = false;
		this.liveQueryCallbacks.clear();
		this.queryResultCache.clear();
		console.log("🔹 SurrealDB WebSocket client closed");
	}
}
