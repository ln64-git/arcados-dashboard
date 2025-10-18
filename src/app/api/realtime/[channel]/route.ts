import type { NextRequest } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";
import type { LiveQueryEvent } from "@/lib/surreal/types";

// Global WebSocket client instance for server-side use
let wsClient: SurrealWebSocketClient | null = null;
const activeSubscriptions = new Map<string, string>(); // channel -> liveQueryId

async function getWebSocketClient(): Promise<SurrealWebSocketClient> {
	console.log("🔹 Getting WebSocket client...");
	if (!wsClient) {
		try {
			console.log("🔹 Creating new WebSocket client...");
			wsClient = new SurrealWebSocketClient();
			console.log("🔹 WebSocket client created, attempting to connect...");
			await wsClient.connect();
			console.log("🔹 WebSocket client connected successfully");
		} catch (error) {
			console.error("🔸 Error creating/connecting WebSocket client:", error);
			throw error;
		}
	} else {
		console.log("🔹 Using existing WebSocket client");
	}
	return wsClient;
}

function createSSEHeaders() {
	return new Headers({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Cache-Control",
	});
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ channel: string }> },
) {
	try {
		const { channel } = await params;
		const url = new URL(request.url);
		const guildId = url.searchParams.get("guildId");
		const channelId = url.searchParams.get("channelId");

		// Check if SurrealDB is configured
		if (!process.env.SURREAL_URL) {
			console.error("🔸 SURREAL_URL environment variable not set");
			return new Response("SurrealDB not configured", { status: 500 });
		}

		// Validate channel parameter
		const validChannels = ["channels", "voice_sessions", "members", "messages"];
		if (!validChannels.includes(channel)) {
			return new Response(
				`Invalid channel: ${channel}. Must be one of: ${validChannels.join(", ")}`,
				{
					status: 400,
				},
			);
		}

		// Validate required parameters based on channel type
		if (channel === "channels" && !guildId) {
			return new Response("guildId parameter required for channels", {
				status: 400,
			});
		}
		if (channel === "messages" && !channelId) {
			return new Response("channelId parameter required for messages", {
				status: 400,
			});
		}
		if (channel === "members" && !guildId) {
			return new Response("guildId parameter required for members", {
				status: 400,
			});
		}

		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			start(controller) {
				// Send initial connection event
				const connectedMessage = `event: connected\ndata: ${JSON.stringify({ channel, timestamp: Date.now() })}\n\n`;
				controller.enqueue(encoder.encode(connectedMessage));

				// Set up live query subscription with error handling
				console.log(
					`🔹 Setting up live query for ${channel} with guildId=${guildId}, channelId=${channelId}`,
				);
				getWebSocketClient()
					.then(async (client) => {
						console.log(`🔹 WebSocket client connected for ${channel}`);
						let liveQueryId: string;

						try {
							switch (channel) {
								case "channels":
									liveQueryId = await client.live(
										`SELECT * FROM channels WHERE guildId = $guildId`,
										{ guildId },
									);
									break;
								case "voice_sessions":
									if (channelId) {
										liveQueryId = await client.live(
											`SELECT * FROM voice_sessions WHERE channelId = $channelId AND isActive = true`,
											{ channelId },
										);
									} else {
										liveQueryId = await client.live(
											`SELECT * FROM voice_sessions WHERE isActive = true`,
										);
									}
									break;
								case "members":
									liveQueryId = await client.live(
										`SELECT * FROM users WHERE guildId = $guildId`,
										{ guildId },
									);
									break;
								case "messages":
									liveQueryId = await client.live(
										`SELECT * FROM messages WHERE channelId = $channelId ORDER BY timestamp DESC LIMIT 50`,
										{ channelId },
									);
									break;
								default:
									throw new Error(`Unknown channel: ${channel}`);
							}

							// Store subscription
							activeSubscriptions.set(channel, liveQueryId);

							// Set up callback for live query events
							client.onLiveQuery(liveQueryId, (event: LiveQueryEvent) => {
								try {
									const updateMessage = `event: update\ndata: ${JSON.stringify({
										action: event.action,
										data: event.result,
										timestamp: Date.now(),
									})}\n\n`;
									controller.enqueue(encoder.encode(updateMessage));
								} catch (error) {
									console.error("🔸 Error writing SSE event:", error);
									const errorMessage = `event: error\ndata: ${JSON.stringify({
										message: "Failed to write event data",
										timestamp: Date.now(),
									})}\n\n`;
									controller.enqueue(encoder.encode(errorMessage));
								}
							});

							console.log(
								`🔹 SSE subscription created for ${channel}: ${liveQueryId}`,
							);
						} catch (error) {
							console.error(
								`🔸 Error setting up live query for ${channel}:`,
								error,
							);
							const errorMessage = `event: error\ndata: ${JSON.stringify({
								message:
									error instanceof Error ? error.message : "Unknown error",
								timestamp: Date.now(),
							})}\n\n`;
							controller.enqueue(encoder.encode(errorMessage));
						}
					})
					.catch((error) => {
						console.error("🔸 Error connecting to WebSocket:", error);
						console.error("🔸 Error details:", {
							message: error instanceof Error ? error.message : String(error),
							stack: error instanceof Error ? error.stack : undefined,
							channel,
							guildId,
							channelId,
						});
						const errorMessage = `event: error\ndata: ${JSON.stringify({
							message: "Failed to connect to database",
							details: error instanceof Error ? error.message : String(error),
							timestamp: Date.now(),
						})}\n\n`;
						controller.enqueue(encoder.encode(errorMessage));
					});

				// Heartbeat to keep connection alive
				const heartbeatInterval = setInterval(() => {
					try {
						const heartbeatMessage = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
						controller.enqueue(encoder.encode(heartbeatMessage));
					} catch (error) {
						console.error("🔸 Error sending heartbeat:", error);
						clearInterval(heartbeatInterval);
					}
				}, 30000); // 30 seconds

				// Cleanup function
				const cleanup = () => {
					clearInterval(heartbeatInterval);
					if (wsClient && activeSubscriptions.has(channel)) {
						const liveQueryId = activeSubscriptions.get(channel);
						if (liveQueryId) {
							wsClient.kill(liveQueryId).catch(console.error);
							activeSubscriptions.delete(channel);
						}
					}
					controller.close();
				};

				// Handle client disconnect
				request.signal.addEventListener("abort", cleanup);

				// Store cleanup for later use
				(controller as any).cleanup = cleanup;
			},
			cancel() {
				// Cleanup when stream is cancelled
				if (wsClient && activeSubscriptions.has(channel)) {
					const liveQueryId = activeSubscriptions.get(channel);
					if (liveQueryId) {
						wsClient.kill(liveQueryId).catch(console.error);
						activeSubscriptions.delete(channel);
					}
				}
			},
		});

		return new Response(stream, {
			headers: createSSEHeaders(),
		});
	} catch (error) {
		console.error("🔸 Error in SSE endpoint:", error);
		return new Response("Internal server error", { status: 500 });
	}
}

// Cleanup function for server shutdown
export async function POST() {
	if (wsClient) {
		await wsClient.close();
		wsClient = null;
	}
	activeSubscriptions.clear();
	return new Response("Cleaned up WebSocket connections", { status: 200 });
}
