"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function SSERefresherChannels() {
	const router = useRouter();
	const esRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		function connectSSE() {
			if (esRef.current?.readyState === EventSource.OPEN) return;
			
			console.log("🔹 Connecting to SSE for realtime updates");
			
			const eventSource = new EventSource('/api/realtime?channel=channels_update');
			esRef.current = eventSource;
			
			eventSource.onopen = () => {
				console.log("🔹 SSE connection opened");
				// Clear any pending reconnection
				if (reconnectTimeoutRef.current) {
					clearTimeout(reconnectTimeoutRef.current);
					reconnectTimeoutRef.current = null;
				}
			};
			
			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					console.log("🔹 SSE message received:", data.type);
					
					if (data.type === 'channels_update' && data.data) {
						console.log("🔹 Channels data updated, dispatching event");
						const evt = new CustomEvent('channels:update', { detail: data.data });
						window.dispatchEvent(evt);
					} else if (data.type === 'heartbeat') {
						console.log("🔹 SSE heartbeat received");
					} else if (data.type === 'connected') {
						console.log("🔹 SSE connected to channel:", data.channel);
					}
				} catch (error) {
					console.error("🔸 Error parsing SSE message:", error);
				}
			};
			
			eventSource.onerror = (error) => {
				console.error("🔸 SSE connection error:", error);
				eventSource.close();
				
				// Reconnect after 3 seconds
				reconnectTimeoutRef.current = window.setTimeout(() => {
					console.log("🔹 Attempting to reconnect SSE...");
					connectSSE();
				}, 3000);
			};
		}

		function disconnectSSE() {
			if (esRef.current) {
				console.log("🔹 Disconnecting SSE");
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
	}, []);

	return null;
}
