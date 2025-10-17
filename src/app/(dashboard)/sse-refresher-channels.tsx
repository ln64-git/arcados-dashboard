"use client";

import { useEffect, useRef } from "react";
import type { DiscordChannel } from "./channels-table";

export function WSRefresherChannels() {
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		function connectWS() {
			if (wsRef.current?.readyState === WebSocket.OPEN) return;
			
			console.log("🔹 Connecting to WebSocket for realtime updates");
			
			// Determine WebSocket URL based on environment
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = window.location.host;
			const wsUrl = `${protocol}//${host}/api/realtime?channel=channels_update`;
			
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;
			
			ws.onopen = () => {
				console.log("🔹 WebSocket connection opened");
				// Clear any pending reconnection
				if (reconnectTimeoutRef.current) {
					clearTimeout(reconnectTimeoutRef.current);
					reconnectTimeoutRef.current = null;
				}
			};
			
			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					console.log("🔹 WebSocket message received:", data.type, data.action);
					
					if (data.type === 'channels_update' && data.data) {
						// Handle SurrealDB Live Query events (CREATE, UPDATE, DELETE)
						const action = data.action; // CREATE, UPDATE, DELETE
						const channelData = data.data;
						
						console.log(`🔹 Channel ${action}:`, channelData);
						
						// Transform SurrealDB channel to DiscordChannel format
						const discordChannel: DiscordChannel = {
							id: channelData.discordId,
							name: channelData.channelName,
							status: channelData.status ?? null,
							type: 2, // Voice channel type
							position: channelData.position,
							userLimit: 0,
							bitrate: 64000,
							parentId: null,
							permissionOverwrites: [],
							memberCount: channelData.memberCount || 0,
						};
						
						// Dispatch event with action type for granular updates
						const evt = new CustomEvent('channels:update', { 
							detail: { 
								action,
								channel: discordChannel,
								timestamp: data.timestamp
							} 
						});
						window.dispatchEvent(evt);
						
					} else if (data.type === 'voice_sessions_update' && data.data) {
						// Handle voice session updates
						console.log("🔹 Voice session update:", data.action, data.data);
						
						const evt = new CustomEvent('voice_sessions:update', { 
							detail: { 
								action: data.action,
								session: data.data,
								timestamp: data.timestamp
							} 
						});
						window.dispatchEvent(evt);
						
					} else if (data.type === 'heartbeat') {
						console.log("🔹 WebSocket heartbeat received");
					} else if (data.type === 'connected') {
						console.log("🔹 WebSocket connected to channel:", data.channel);
					} else if (data.type === 'error') {
						console.error("🔸 WebSocket error:", data.error);
					}
				} catch (error) {
					console.error("🔸 Error parsing WebSocket message:", error);
				}
			};
			
			ws.onclose = (event) => {
				console.log("🔸 WebSocket connection closed:", event.code, event.reason);
				
				// Reconnect after 3 seconds if not a clean close
				if (event.code !== 1000) {
					reconnectTimeoutRef.current = window.setTimeout(() => {
						console.log("🔹 Attempting to reconnect WebSocket...");
						connectWS();
					}, 3000);
				}
			};
			
			ws.onerror = (error) => {
				console.error("🔸 WebSocket connection error:", error);
			};
		}

		function disconnectWS() {
			if (wsRef.current) {
				console.log("🔹 Disconnecting WebSocket");
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
	}, []);

	return null;
}
