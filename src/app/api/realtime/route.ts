import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const channel = url.searchParams.get("channel") || "channels_update";

	// Create a readable stream for SSE
	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			// Send initial connection message
			const initialMessage = `data: ${JSON.stringify({
				type: "connected",
				channel,
				timestamp: new Date().toISOString(),
			})}\n\n`;
			controller.enqueue(encoder.encode(initialMessage));

			let isConnected = true;
			let lastDataHash = "";

			// Poll for changes and send updates via SSE
			const pollForChanges = async () => {
				if (!isConnected) return;

				try {
					let response: Response;
					let data: unknown;

					if (channel === "channels_update") {
						response = await fetch(`${url.origin}/api/channels`, {
							headers: {
								"Cache-Control": "no-cache",
							},
						});

						if (response.ok) {
							data = await response.json();
							const currentDataHash = JSON.stringify(data);

							// Only send update if data has changed
							if (currentDataHash !== lastDataHash) {
								lastDataHash = currentDataHash;

								const updateMessage = `data: ${JSON.stringify({
									type: "channels_update",
									data,
									timestamp: new Date().toISOString(),
								})}\n\n`;
								controller.enqueue(encoder.encode(updateMessage));
							}
						}
					} else if (channel === "voice_sessions_update") {
						// For voice sessions, we'll simulate updates by checking for changes
						// In a real implementation, this would be triggered by database changes
						const updateMessage = `data: ${JSON.stringify({
							type: "voice_sessions_update",
							data: {
								channelId: "simulated",
								userId: "simulated",
								event: "UPDATE",
								table: "voice_channel_sessions",
								updatedAt: new Date().toISOString(),
							},
							timestamp: new Date().toISOString(),
						})}\n\n`;
						controller.enqueue(encoder.encode(updateMessage));
					}
				} catch (error) {
					console.error("🔸 Error polling for changes:", error);
				}
			};

			// Start polling immediately, then every 1 second
			pollForChanges();
			const pollInterval = setInterval(pollForChanges, 1000);

			// Send heartbeat every 30 seconds
			const heartbeat = setInterval(() => {
				if (isConnected) {
					const heartbeatMessage = `data: ${JSON.stringify({
						type: "heartbeat",
						timestamp: new Date().toISOString(),
					})}\n\n`;
					controller.enqueue(encoder.encode(heartbeatMessage));
				}
			}, 30000);

			// Cleanup function
			const cleanup = () => {
				isConnected = false;
				clearInterval(pollInterval);
				clearInterval(heartbeat);
			};

			// Handle client disconnect
			request.signal.addEventListener("abort", cleanup);

			// Store cleanup function
			(controller as { cleanup?: () => void }).cleanup = cleanup;
		},

		cancel() {
			if ((this as { cleanup?: () => void }).cleanup) {
				(this as { cleanup?: () => void }).cleanup();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control",
		},
	});
}
