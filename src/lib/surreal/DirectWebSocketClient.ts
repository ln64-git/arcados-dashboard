"use client";

export interface SurrealWebSocketMessage {
	id?: string;
	method: string;
	params: unknown[];
	result?: unknown;
	error?: { message: string };
}

export interface LiveQueryEvent<T = unknown> {
	action: "CREATE" | "UPDATE" | "DELETE";
	result: T;
}

export interface DirectWebSocketClientOptions {
	onChannelUpdate?: (event: LiveQueryEvent) => void;
	onVoiceSessionUpdate?: (event: LiveQueryEvent) => void;
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
}

export class DirectWebSocketClient {
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
	private options: DirectWebSocketClientOptions;

	constructor(options: DirectWebSocketClientOptions = {}) {
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

		// Convert HTTP URL to WebSocket RPC URL
		this.wsUrl = this.convertToWebSocketUrl(surrealUrl);
	}

	private convertToWebSocketUrl(url: string): string {
		const parsedUrl = new URL(url);

		if (parsedUrl.protocol === "https:") {
			return `wss://${parsedUrl.host}/rpc`;
		} else if (parsedUrl.protocol === "http:") {
			return `ws://${parsedUrl.host}/rpc`;
		} else if (parsedUrl.protocol === "wss:") {
			if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
				return `wss://${parsedUrl.host}/rpc`;
			}
			return url;
		} else if (parsedUrl.protocol === "ws:") {
			if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
				return `ws://${parsedUrl.host}/rpc`;
			}
			return url;
		}

		throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
	}

	async connect(): Promise<void> {
		if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		return new Promise((resolve, reject) => {
			console.log("🔹 Connecting directly to SurrealDB WebSocket...");
			console.log("🔹 URL:", this.wsUrl);

			this.ws = new WebSocket(this.wsUrl);

			this.ws.onopen = async () => {
				console.log("🔹 Direct WebSocket connection opened");

				try {
					// Wait a brief moment to ensure WebSocket is fully ready
					await new Promise((resolve) => setTimeout(resolve, 200));

					console.log("🔹 Setting namespace and database...");
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

					if (this.options.onConnect) {
						this.options.onConnect();
					}

					resolve();
				} catch (error) {
					console.error("🔸 Authentication failed:", error);
					reject(error);
				}
			};

			this.ws.onmessage = (event) => {
				try {
					const data: SurrealWebSocketMessage = JSON.parse(event.data);
					this.handleMessage(data);
				} catch (error) {
					console.error("🔸 Error parsing WebSocket message:", error);
				}
			};

			this.ws.onclose = (event) => {
				console.log(
					"🔸 Direct WebSocket connection closed:",
					event.code,
					event.reason,
				);
				this.isConnected = false;

				if (this.options.onDisconnect) {
					this.options.onDisconnect();
				}

				// Attempt reconnection if not a clean close
				if (
					event.code !== 1000 &&
					this.reconnectAttempts < this.maxReconnectAttempts
				) {
					this.reconnectAttempts++;
					const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);
					console.log(
						`🔹 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
					);

					setTimeout(() => {
						this.connect().catch(console.error);
					}, delay);
				}
			};

			this.ws.onerror = (error) => {
				console.error("🔸 Direct WebSocket connection error:", error);
				if (this.options.onError) {
					this.options.onError(new Error("WebSocket connection failed"));
				}
				reject(error);
			};
		});
	}

	private async use(namespace: string, database: string): Promise<void> {
		const message = {
			id: "use",
			method: "use",
			params: [namespace, database],
		};

		await this.sendMessage(message);
	}

	private async authenticate(token: string): Promise<void> {
		this.token = token;
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
		const message = {
			id: "signin",
			method: "signin",
			params: [{ user: username, pass: password }],
		};

		await this.sendMessage(message);
	}

	private async sendMessage(
		message: SurrealWebSocketMessage,
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
			}, 30000);

			const originalOnMessage = this.ws?.onmessage || null;
			if (this.ws) {
				this.ws.onmessage = (event) => {
					try {
						const data: SurrealWebSocketMessage = JSON.parse(event.data);

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

	private handleMessage(data: SurrealWebSocketMessage): void {
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
		const message = {
			id: `kill_${Date.now()}`,
			method: "kill",
			params: [liveQueryId],
		};

		await this.sendMessage(message);
	}

	onLiveQuery(
		liveQueryId: string,
		callback: (data: LiveQueryEvent) => void,
	): void {
		this.liveQueryCallbacks.set(liveQueryId, callback);
	}

	offLiveQuery(liveQueryId: string): void {
		this.liveQueryCallbacks.delete(liveQueryId);
	}

	async disconnect(): Promise<void> {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.close();
		}
		this.isConnected = false;
		this.liveQueryCallbacks.clear();
		console.log("🔹 Direct SurrealDB WebSocket disconnected");
	}

	// Convenience methods for common live queries
	async subscribeToGuildChannels(
		guildId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		const query = `
			LIVE SELECT * FROM channels 
			WHERE guildId = $guildId AND isActive = true
		`;

		const liveQueryId = await this.live(query, { guildId });
		this.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to channels for guild ${guildId}`);
		return liveQueryId;
	}

	async subscribeToAllVoiceSessions(
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		const query = `
			LIVE SELECT * FROM voice_channel_sessions 
			WHERE is_active = true
		`;

		const liveQueryId = await this.live(query, {});
		this.onLiveQuery(liveQueryId, callback);

		console.log("🔹 Subscribed to all active voice sessions");
		return liveQueryId;
	}
}
