"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function WSRefresher({ channelId }: { channelId: string }) {
	const router = useRouter();
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		function connectWS() {
			if (wsRef.current?.readyState === WebSocket.OPEN) return;
			
			console.log("🔹 Connecting to WebSocket for channel updates:", channelId);
			
			// Determine WebSocket URL based on environment
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = window.location.host;
			const wsUrl = `${protocol}//${host}/api/realtime?channel=voice_sessions_update`;
			
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;
			
			ws.onopen = () => {
				console.log("🔹 Channel WebSocket connection opened");
				// Clear any pending reconnection
				if (reconnectTimeoutRef.current) {
					clearTimeout(reconnectTimeoutRef.current);
					reconnectTimeoutRef.current = null;
				}
			};
			
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					console.log("🔹 Channel WebSocket message received:", data.type);
					
					if (data.type === 'voice_sessions_update' && data.data) {
						// Check if this update is for our channel
						if (data.data.channelId === channelId) {
							console.log("🔹 Channel data updated for:", channelId);
							router.refresh();
						}
					} else if (data.type === 'heartbeat') {
						console.log("🔹 Channel WebSocket heartbeat received");
					} else if (data.type === 'connected') {
						console.log("🔹 Channel WebSocket connected to channel:", data.channel);
					}
				} catch (error) {
					console.error("🔸 Error parsing channel WebSocket message:", error);
				}
			};
			
			ws.onclose = (event) => {
				console.log("🔸 Channel WebSocket connection closed:", event.code, event.reason);
				
				// Reconnect after 3 seconds if not a clean close
				if (event.code !== 1000) {
					reconnectTimeoutRef.current = window.setTimeout(() => {
						console.log("🔹 Attempting to reconnect channel WebSocket...");
						connectWS();
					}, 3000);
				}
			};
			
			ws.onerror = (error) => {
				console.error("🔸 Channel WebSocket connection error:", error);
			};
		}

		function disconnectWS() {
			if (wsRef.current) {
				console.log("🔹 Disconnecting channel WebSocket");
				wsRef.current.close(1000, "Component unmounting");
				wsRef.current = null;
			}
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
		}

		// Start WebSocket connection
		connectWS();
		
		return () => {
			disconnectWS();
		};
	}, [channelId, router]);

	return null;
}
