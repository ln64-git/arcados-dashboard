export async function GET() {
	try {
		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			start(controller) {
				// Send initial connection event
				const message = `event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
				controller.enqueue(encoder.encode(message));

				// Send a test event every 2 seconds
				const interval = setInterval(() => {
					try {
						const testMessage = `event: test\ndata: ${JSON.stringify({
							message: "Hello from SSE!",
							timestamp: Date.now(),
						})}\n\n`;
						controller.enqueue(encoder.encode(testMessage));
					} catch (error) {
						console.error("Error writing test event:", error);
						clearInterval(interval);
					}
				}, 2000);

				// Cleanup function
				const cleanup = () => {
					clearInterval(interval);
					controller.close();
				};

				// Store cleanup for later use
				(controller as any).cleanup = cleanup;
			},
			cancel() {
				// Cleanup when stream is cancelled
				console.log("SSE stream cancelled");
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
		console.error("Error in test SSE endpoint:", error);
		return new Response("Internal server error", { status: 500 });
	}
}
