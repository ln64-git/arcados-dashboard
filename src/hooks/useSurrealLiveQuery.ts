"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	createSSEConnection,
	type SSEConnection,
} from "@/lib/surreal/sse-utils";
import type {
	LiveQueryEvent,
	SSEConnectionOptions,
	SSEEvent,
} from "@/lib/surreal/types";

export interface UseSurrealLiveQueryOptions {
	onChannelUpdate?: (event: LiveQueryEvent) => void;
	onVoiceSessionUpdate?: (event: LiveQueryEvent) => void;
	onMemberUpdate?: (event: LiveQueryEvent) => void;
	onMessageUpdate?: (event: LiveQueryEvent) => void;
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	reconnectDelay?: number;
	maxReconnectAttempts?: number;
}

export interface UseSurrealLiveQueryReturn {
	isConnected: boolean;
	error: string | null;
	reconnect: () => Promise<void>;
	subscribeToChannels: (
		guildId: string,
		callback: (event: LiveQueryEvent) => void,
	) => Promise<string>;
	subscribeToVoiceSessions: (
		channelId?: string,
		callback?: (event: LiveQueryEvent) => void,
	) => Promise<string>;
	subscribeToMembers: (
		guildId: string,
		callback: (event: LiveQueryEvent) => void,
	) => Promise<string>;
	subscribeToMessages: (
		channelId: string,
		callback: (event: LiveQueryEvent) => void,
	) => Promise<string>;
	unsubscribe: (subscriptionId: string) => Promise<void>;
}

export function useSurrealLiveQuery(
	options: UseSurrealLiveQueryOptions = {},
): UseSurrealLiveQueryReturn {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const connectionsRef = useRef<Map<string, SSEConnection>>(new Map());
	const isMountedRef = useRef(true);
	const optionsRef = useRef(options);

	// Update options ref when options change
	useEffect(() => {
		optionsRef.current = options;
	}, [options]);

	const createConnection = useCallback(
		(channel: string, params: { guildId?: string; channelId?: string }) => {
			const connectionOptions: SSEConnectionOptions = {
				channel,
				...params,
				onMessage: (event: SSEEvent) => {
					if (event.event === "update") {
						const liveQueryEvent: LiveQueryEvent = {
							action: event.data.action,
							result: event.data.data,
						};

						// Call appropriate callback based on channel
						switch (channel) {
							case "channels":
								optionsRef.current.onChannelUpdate?.(liveQueryEvent);
								break;
							case "voice_sessions":
								optionsRef.current.onVoiceSessionUpdate?.(liveQueryEvent);
								break;
							case "members":
								optionsRef.current.onMemberUpdate?.(liveQueryEvent);
								break;
							case "messages":
								optionsRef.current.onMessageUpdate?.(liveQueryEvent);
								break;
						}
					}
				},
				onError: (err) => {
					console.error("🔸 SSE connection error:", err);
					if (isMountedRef.current) {
						setError(err.message);
					}
					optionsRef.current.onError?.(err);
				},
				onConnect: () => {
					console.log(`🔹 SSE connected to ${channel}`);
					if (isMountedRef.current) {
						setIsConnected(true);
						setError(null);
					}
					optionsRef.current.onConnect?.();
				},
				onDisconnect: () => {
					console.log(`🔸 SSE disconnected from ${channel}`);
					if (isMountedRef.current) {
						setIsConnected(false);
					}
					optionsRef.current.onDisconnect?.();
				},
				reconnectDelay: options.reconnectDelay || 1000,
				maxReconnectAttempts: options.maxReconnectAttempts || 5,
			};

			return createSSEConnection(connectionOptions);
		},
		[options],
	);

	const subscribeToChannels = useCallback(
		async (
			guildId: string,
			callback: (event: LiveQueryEvent) => void,
		): Promise<string> => {
			const subscriptionId = `channels_${guildId}_${Date.now()}`;
			const connection = createConnection("channels", { guildId });

			// Override the onMessage callback for this specific subscription
			const originalOnMessage = connection["options"].onMessage;
			connection["options"].onMessage = (event: SSEEvent) => {
				originalOnMessage?.(event);
				if (event.event === "update") {
					const liveQueryEvent: LiveQueryEvent = {
						action: event.data.action,
						result: event.data.data,
					};
					callback(liveQueryEvent);
				}
			};

			connectionsRef.current.set(subscriptionId, connection);
			await connection.connect();
			return subscriptionId;
		},
		[createConnection],
	);

	const subscribeToVoiceSessions = useCallback(
		async (
			channelId?: string,
			callback?: (event: LiveQueryEvent) => void,
		): Promise<string> => {
			const subscriptionId = `voice_sessions_${channelId || "all"}_${Date.now()}`;
			const connection = createConnection("voice_sessions", { channelId });

			if (callback) {
				const originalOnMessage = connection["options"].onMessage;
				connection["options"].onMessage = (event: SSEEvent) => {
					originalOnMessage?.(event);
					if (event.event === "update") {
						const liveQueryEvent: LiveQueryEvent = {
							action: event.data.action,
							result: event.data.data,
						};
						callback(liveQueryEvent);
					}
				};
			}

			connectionsRef.current.set(subscriptionId, connection);
			await connection.connect();
			return subscriptionId;
		},
		[createConnection],
	);

	const subscribeToMembers = useCallback(
		async (
			guildId: string,
			callback: (event: LiveQueryEvent) => void,
		): Promise<string> => {
			const subscriptionId = `members_${guildId}_${Date.now()}`;
			const connection = createConnection("members", { guildId });

			const originalOnMessage = connection["options"].onMessage;
			connection["options"].onMessage = (event: SSEEvent) => {
				originalOnMessage?.(event);
				if (event.event === "update") {
					const liveQueryEvent: LiveQueryEvent = {
						action: event.data.action,
						result: event.data.data,
					};
					callback(liveQueryEvent);
				}
			};

			connectionsRef.current.set(subscriptionId, connection);
			await connection.connect();
			return subscriptionId;
		},
		[createConnection],
	);

	const subscribeToMessages = useCallback(
		async (
			channelId: string,
			callback: (event: LiveQueryEvent) => void,
		): Promise<string> => {
			const subscriptionId = `messages_${channelId}_${Date.now()}`;
			const connection = createConnection("messages", { channelId });

			const originalOnMessage = connection["options"].onMessage;
			connection["options"].onMessage = (event: SSEEvent) => {
				originalOnMessage?.(event);
				if (event.event === "update") {
					const liveQueryEvent: LiveQueryEvent = {
						action: event.data.action,
						result: event.data.data,
					};
					callback(liveQueryEvent);
				}
			};

			connectionsRef.current.set(subscriptionId, connection);
			await connection.connect();
			return subscriptionId;
		},
		[createConnection],
	);

	const unsubscribe = useCallback(
		async (subscriptionId: string): Promise<void> => {
			const connection = connectionsRef.current.get(subscriptionId);
			if (connection) {
				connection.disconnect();
				connectionsRef.current.delete(subscriptionId);
				console.log("🔹 Unsubscribed from:", subscriptionId);
			}
		},
		[],
	);

	const reconnect = useCallback(async (): Promise<void> => {
		console.log("🔹 Reconnecting all SSE connections...");
		setError(null);

		// Disconnect all existing connections
		for (const [id, connection] of connectionsRef.current.entries()) {
			connection.disconnect();
		}
		connectionsRef.current.clear();

		// Reconnect will be handled by individual subscription calls
		setIsConnected(false);
	}, []);

	useEffect(() => {
		isMountedRef.current = true;

		return () => {
			isMountedRef.current = false;
			// Cleanup all connections on unmount
			for (const [id, connection] of connectionsRef.current.entries()) {
				connection.disconnect();
			}
			connectionsRef.current.clear();
		};
	}, []);

	return {
		isConnected,
		error,
		reconnect,
		subscribeToChannels,
		subscribeToVoiceSessions,
		subscribeToMembers,
		subscribeToMessages,
		unsubscribe,
	};
}

// Specialized hook for channel updates (replaces useChannelLiveQuery)
export function useChannelLiveQuery(
	initialChannels: unknown[],
	_initialTotal: number,
) {
	const [channels, setChannels] = useState(initialChannels);
	const [isLoading, setIsLoading] = useState(false);

	const { subscribeToChannels, unsubscribe, isConnected, error } =
		useSurrealLiveQuery({
			onChannelUpdate: (event) => {
				console.log("🔹 Channel update received:", event);
				setChannels((prev) => {
					// Handle CREATE/UPDATE/DELETE events properly
					if (event.action === "CREATE") {
						return [...prev, event.result];
					} else if (event.action === "UPDATE") {
						return prev.map((channel) =>
							(channel as Record<string, unknown>).id ===
							(event.result as Record<string, unknown>).id
								? event.result
								: channel,
						);
					} else if (event.action === "DELETE") {
						return prev.filter(
							(channel) =>
								(channel as Record<string, unknown>).id !==
								(event.result as Record<string, unknown>).id,
						);
					}
					return prev;
				});
			},
		});

	const subscribeToGuildChannels = useCallback(
		async (guildId: string) => {
			if (!isConnected) {
				console.warn("🔸 Not connected to SSE");
				return;
			}

			setIsLoading(true);
			try {
				await subscribeToChannels(guildId, () => {
					// Callback is handled by onChannelUpdate
				});
			} catch (err) {
				console.error("🔸 Error subscribing to guild channels:", err);
			} finally {
				setIsLoading(false);
			}
		},
		[isConnected, subscribeToChannels],
	);

	return {
		channels,
		isLoading,
		isConnected,
		error,
		subscribeToGuildChannels,
		unsubscribe,
	};
}
