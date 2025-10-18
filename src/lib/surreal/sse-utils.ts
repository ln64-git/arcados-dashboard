export interface SSEEvent {
	event: string;
	data: unknown;
	timestamp: number;
}

export interface SSEConnectionOptions {
	channel: string;
	guildId?: string;
	channelId?: string;
	onMessage?: (event: SSEEvent) => void;
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	reconnectDelay?: number;
	maxReconnectAttempts?: number;
}

export class SSEConnection {
	private eventSource: EventSource | null = null;
	private reconnectAttempts = 0;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private options: Required<SSEConnectionOptions>;

	constructor(options: SSEConnectionOptions) {
		this.options = {
			reconnectDelay: 1000,
			maxReconnectAttempts: 5,
			onMessage: () => {},
			onError: () => {},
			onConnect: () => {},
			onDisconnect: () => {},
			...options,
		};
	}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const url = this.buildSSEUrl();
				console.log("🔹 Connecting to SSE:", url);

				this.eventSource = new EventSource(url);

				this.eventSource.onopen = () => {
					console.log("🔹 SSE connection opened");
					this.reconnectAttempts = 0;
					this.options.onConnect();
					resolve();
				};

				this.eventSource.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						const sseEvent: SSEEvent = {
							event: event.type || "message",
							data,
							timestamp: Date.now(),
						};
						this.options.onMessage(sseEvent);
					} catch (parseError) {
						console.error("🔸 Error parsing SSE message:", parseError);
						this.options.onError(parseError as Error);
					}
				};

				this.eventSource.addEventListener("connected", (event) => {
					console.log("🔹 SSE connected event received");
				});

				this.eventSource.addEventListener("update", (event) => {
					try {
						const data = JSON.parse(event.data);
						this.options.onMessage({
							event: "update",
							data,
							timestamp: Date.now(),
						});
					} catch (error) {
						console.error("🔸 Error parsing update event:", error);
					}
				});

				this.eventSource.addEventListener("error", (event) => {
					try {
						const data = JSON.parse(event.data);
						this.options.onError(new Error(data.message || "SSE error"));
					} catch (error) {
						this.options.onError(new Error("SSE error"));
					}
				});

				this.eventSource.addEventListener("heartbeat", () => {
					// Heartbeat received, connection is alive
				});

				this.eventSource.onerror = (error) => {
					console.error("🔸 SSE connection error:", error);
					this.options.onError(new Error("SSE connection failed"));

					if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
						this.scheduleReconnect();
					} else {
						reject(new Error("Max reconnection attempts reached"));
					}
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	private buildSSEUrl(): string {
		const params = new URLSearchParams();

		if (this.options.guildId) {
			params.set("guildId", this.options.guildId);
		}
		if (this.options.channelId) {
			params.set("channelId", this.options.channelId);
		}

		const queryString = params.toString();
		return `/api/realtime/${this.options.channel}${queryString ? `?${queryString}` : ""}`;
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectAttempts++;
		const delay =
			this.options.reconnectDelay * 2 ** (this.reconnectAttempts - 1);

		console.log(
			`🔹 Attempting SSE reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`,
		);

		this.reconnectTimer = setTimeout(() => {
			this.disconnect();
			this.connect().catch(console.error);
		}, delay);
	}

	disconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.eventSource) {
			this.eventSource.close();
			this.eventSource = null;
		}

		this.options.onDisconnect();
		console.log("🔹 SSE connection closed");
	}

	get isConnected(): boolean {
		return this.eventSource?.readyState === EventSource.OPEN;
	}
}

export function createSSEConnection(
	options: SSEConnectionOptions,
): SSEConnection {
	return new SSEConnection(options);
}

export function parseSSEEvent(eventData: string): SSEEvent | null {
	try {
		const data = JSON.parse(eventData);
		return {
			event: "message",
			data,
			timestamp: Date.now(),
		};
	} catch (error) {
		console.error("🔸 Error parsing SSE event:", error);
		return null;
	}
}

export function handleSSEError(error: Error): void {
	console.error("🔸 SSE Error:", error.message);

	// You can add custom error handling logic here
	// For example, showing user notifications, logging to analytics, etc.

	if (error.message.includes("connection")) {
		console.log("🔹 Connection error detected, will attempt reconnection");
	} else if (error.message.includes("parse")) {
		console.log("🔸 Data parsing error, skipping event");
	} else if (error.message.includes("timeout")) {
		console.log("🔸 Timeout error, will retry connection");
	} else if (error.message.includes("network")) {
		console.log("🔸 Network error, checking connectivity");
	}

	// Add error reporting to external service if needed
	// reportError(error);
}

export function withRetry<T>(
	fn: () => Promise<T>,
	maxAttempts: number = 3,
	delay: number = 1000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		let attempts = 0;

		const attempt = async () => {
			try {
				const result = await fn();
				resolve(result);
			} catch (error) {
				attempts++;
				console.log(`🔸 Attempt ${attempts}/${maxAttempts} failed:`, error);

				if (attempts >= maxAttempts) {
					reject(error);
				} else {
					const backoffDelay = delay * 2 ** (attempts - 1); // Exponential backoff
					console.log(`🔹 Retrying in ${backoffDelay}ms...`);
					setTimeout(attempt, backoffDelay);
				}
			}
		};

		attempt();
	});
}

export function createErrorBoundary(error: Error): {
	message: string;
	code: string;
	shouldRetry: boolean;
	retryAfter?: number;
} {
	const errorMap: Record<
		string,
		{ code: string; shouldRetry: boolean; retryAfter?: number }
	> = {
		connection: {
			code: "CONNECTION_ERROR",
			shouldRetry: true,
			retryAfter: 5000,
		},
		timeout: { code: "TIMEOUT_ERROR", shouldRetry: true, retryAfter: 3000 },
		network: { code: "NETWORK_ERROR", shouldRetry: true, retryAfter: 10000 },
		parse: { code: "PARSE_ERROR", shouldRetry: false },
		auth: { code: "AUTH_ERROR", shouldRetry: false },
		rate: { code: "RATE_LIMIT_ERROR", shouldRetry: true, retryAfter: 60000 },
	};

	const errorType =
		Object.keys(errorMap).find((key) =>
			error.message.toLowerCase().includes(key),
		) || "unknown";

	const errorInfo = errorMap[errorType] || {
		code: "UNKNOWN_ERROR",
		shouldRetry: false,
	};

	return {
		message: error.message,
		code: errorInfo.code,
		shouldRetry: errorInfo.shouldRetry,
		retryAfter: errorInfo.retryAfter,
	};
}
