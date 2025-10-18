import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	try {
		console.log("🔹 Testing SSE connection to real SurrealDB...");

		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				console.log("🔹 Starting SSE stream...");

				// Send initial connection message
				const connectedMessage = `event: connected\ndata: ${JSON.stringify({
					timestamp: Date.now(),
					message: "Connected to real SurrealDB SSE",
				})}\n\n`;
				controller.enqueue(encoder.encode(connectedMessage));

				// Test WebSocket connection to real SurrealDB
				const WebSocket = require("ws");
				const wsUrl =
					"wss://surreal-ember-06cuvh0l59r69ao4mpq0kmd2fk.aws-use1.surreal.cloud/rpc";

				console.log("🔹 Connecting to WebSocket:", wsUrl);
				const ws = new WebSocket(wsUrl);

				ws.on("open", () => {
					console.log("🔹 WebSocket connected to real SurrealDB");

					// Send authentication
					const authMessage = {
						id: "auth_test",
						method: "signin",
						params: [
							{
								user: "root",
								pass: "root",
							},
						],
					};

					ws.send(JSON.stringify(authMessage));
				});

				ws.on("message", (data) => {
					console.log("🔹 WebSocket message received:", data.toString());

					try {
						const response = JSON.parse(data.toString());

						if (response.id === "auth_test" && response.result) {
							console.log("🔹 Authentication successful!");

							// Send success message via SSE
							const successMessage = `event: auth_success\ndata: ${JSON.stringify(
								{
									timestamp: Date.now(),
									token: response.result,
									message: "Authentication successful",
								},
							)}\n\n`;
							controller.enqueue(encoder.encode(successMessage));

							// Set namespace and database
							const useMessage = {
								id: "use_test",
								method: "use",
								params: ["arcados-bot", "arcados-bot"],
							};
							ws.send(JSON.stringify(useMessage));
						} else if (response.id === "use_test" && response.result) {
							console.log("🔹 Namespace and database set successfully");

							// Send namespace success message
							const namespaceMessage = `event: namespace_set\ndata: ${JSON.stringify(
								{
									timestamp: Date.now(),
									namespace: "arcados-bot",
									database: "arcados-bot",
									message: "Namespace and database set",
								},
							)}\n\n`;
							controller.enqueue(encoder.encode(namespaceMessage));

							// Create a live query
							const liveQueryMessage = {
								id: "live_test",
								method: "live",
								params: [
									"SELECT * FROM channels WHERE guildId = $guildId",
									{ guildId: "1254694808228986912" },
								],
							};
							ws.send(JSON.stringify(liveQueryMessage));
						} else if (response.method === "notify" && response.params) {
							console.log(
								"🔹 Live query notification received:",
								response.params,
							);

							// Send live query update via SSE
							const liveMessage = `event: live_update\ndata: ${JSON.stringify({
								timestamp: Date.now(),
								action: response.params[1]?.action,
								data: response.params[1]?.result,
								message: "Live query update received",
							})}\n\n`;
							controller.enqueue(encoder.encode(liveMessage));
						}
					} catch (error) {
						console.error("🔸 Error parsing WebSocket message:", error);
					}
				});

				ws.on("error", (error) => {
					console.error("🔸 WebSocket error:", error);
					const errorMessage = `event: error\ndata: ${JSON.stringify({
						timestamp: Date.now(),
						error: error.message,
						message: "WebSocket connection error",
					})}\n\n`;
					controller.enqueue(encoder.encode(errorMessage));
				});

				ws.on("close", () => {
					console.log("🔸 WebSocket connection closed");
					const closeMessage = `event: close\ndata: ${JSON.stringify({
						timestamp: Date.now(),
						message: "WebSocket connection closed",
					})}\n\n`;
					controller.enqueue(encoder.encode(closeMessage));
				});

				// Cleanup function
				const cleanup = () => {
					console.log("🔹 Cleaning up WebSocket connection");
					ws.close();
					controller.close();
				};

				// Store cleanup function for later use
				(controller as any).cleanup = cleanup;
			},
			cancel() {
				console.log("🔸 SSE stream cancelled");
				if ((this as any).cleanup) {
					(this as any).cleanup();
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
	} catch (error) {
		console.error("🔸 SSE endpoint error:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : String(error),
				timestamp: Date.now(),
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
