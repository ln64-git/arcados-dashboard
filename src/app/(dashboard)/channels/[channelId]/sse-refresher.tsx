"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function SSERefresher({ channelId }: { channelId: string }) {
	const router = useRouter();
	const esRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		function connectSSE() {
			if (esRef.current?.readyState === EventSource.OPEN) return;
			
			console.log("🔹 Connecting to SSE for channel updates:", channelId);
			
			const eventSource = new EventSource(`/api/realtime?channel=voice_sessions_update`);
			esRef.current = eventSource;
			
			eventSource.onopen = () => {
				console.log("🔹 Channel SSE connection opened");
				// Clear any pending reconnection
				if (reconnectTimeoutRef.current) {
					clearTimeout(reconnectTimeoutRef.current);
					reconnectTimeoutRef.current = null;
				}
			};
			
			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					console.log("🔹 Channel SSE message received:", data.type);
					
					if (data.type === 'voice_sessions_update' && data.data) {
						// Check if this update is for our channel
						if (data.data.channelId === channelId) {
							console.log("🔹 Channel data updated for:", channelId);
							router.refresh();
						}
					} else if (data.type === 'heartbeat') {
						console.log("🔹 Channel SSE heartbeat received");
					} else if (data.type === 'connected') {
						console.log("🔹 Channel SSE connected to channel:", data.channel);
					}
				} catch (error) {
					console.error("🔸 Error parsing channel SSE message:", error);
				}
			};
			
			eventSource.onerror = (error) => {
				console.error("🔸 Channel SSE connection error:", error);
				eventSource.close();
				
				// Reconnect after 3 seconds
				reconnectTimeoutRef.current = window.setTimeout(() => {
					console.log("🔹 Attempting to reconnect channel SSE...");
					connectSSE();
				}, 3000);
			};
		}

		function disconnectSSE() {
			if (esRef.current) {
				console.log("🔹 Disconnecting channel SSE");
				esRef.current.close();
				esRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
		}

		// Start SSE connection
		connectSSE();
		
		return () => {
			disconnectSSE();
		};
	}, [channelId, router]);

	return null;
}
