"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	DirectWebSocketClient,
	type LiveQueryEvent,
} from "@/lib/surreal/DirectWebSocketClient";

export interface UseDirectWebSocketOptions {
	onChannelUpdate?: (event: LiveQueryEvent) => void;
	onVoiceSessionUpdate?: (event: LiveQueryEvent) => void;
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
}

export interface UseDirectWebSocketReturn {
	isConnected: boolean;
	error: string | null;
	reconnect: () => void;
	subscribeToChannels: (
		guildId: string,
		callback: (event: LiveQueryEvent) => void,
	) => Promise<string>;
	subscribeToVoiceSessions: (
		callback: (event: LiveQueryEvent) => void,
	) => Promise<string>;
	unsubscribe: (liveQueryId: string) => Promise<void>;
}

export function useDirectWebSocket(
	options: UseDirectWebSocketOptions = {},
): UseDirectWebSocketReturn {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const clientRef = useRef<DirectWebSocketClient | null>(null);
	const liveQueriesRef = useRef<Map<string, string>>(new Map()); // query key -> live query ID
	const isMountedRef = useRef(true);

	const connect = useCallback(async () => {
		if (clientRef.current?.isConnected) return;

		try {
			console.log("🔹 Creating direct WebSocket client...");
			clientRef.current = new DirectWebSocketClient({
				onChannelUpdate: options.onChannelUpdate,
				onVoiceSessionUpdate: options.onVoiceSessionUpdate,
				onError: (err) => {
					console.error("🔸 Direct WebSocket error:", err);
					setError(err.message);
					if (options.onError) {
						options.onError(err);
					}
				},
				onConnect: () => {
					console.log("🔹 Direct WebSocket connected");
					setIsConnected(true);
					setError(null);
					if (options.onConnect) {
						options.onConnect();
					}
				},
				onDisconnect: () => {
					console.log("🔸 Direct WebSocket disconnected");
					setIsConnected(false);
					if (options.onDisconnect) {
						options.onDisconnect();
					}
				},
			});

			await clientRef.current.connect();
		} catch (err) {
			console.error("🔸 Failed to connect direct WebSocket:", err);
			setError(err instanceof Error ? err.message : "Connection failed");
		}
	}, [options]);

	const disconnect = useCallback(async () => {
		if (clientRef.current) {
			console.log("🔹 Disconnecting direct WebSocket...");
			await clientRef.current.disconnect();
			clientRef.current = null;
		}
		setIsConnected(false);
		liveQueriesRef.current.clear();
	}, []);

	const reconnect = useCallback(async () => {
		console.log("🔹 Reconnecting direct WebSocket...");
		await disconnect();
		setError(null);
		await connect();
	}, [connect, disconnect]);

	const subscribeToChannels = useCallback(
		async (
			guildId: string,
			callback: (event: LiveQueryEvent) => void,
		): Promise<string> => {
			if (!clientRef.current) {
				throw new Error("WebSocket client not connected");
			}

			const queryKey = `guild_channels_${guildId}`;
			const liveQueryId = await clientRef.current.subscribeToGuildChannels(
				guildId,
				callback,
			);
			liveQueriesRef.current.set(queryKey, liveQueryId);

			return liveQueryId;
		},
		[],
	);

	const subscribeToVoiceSessions = useCallback(
		async (callback: (event: LiveQueryEvent) => void): Promise<string> => {
			if (!clientRef.current) {
				throw new Error("WebSocket client not connected");
			}

			const queryKey = "all_voice_sessions";
			const liveQueryId =
				await clientRef.current.subscribeToAllVoiceSessions(callback);
			liveQueriesRef.current.set(queryKey, liveQueryId);

			return liveQueryId;
		},
		[],
	);

	const unsubscribe = useCallback(
		async (liveQueryId: string): Promise<void> => {
			if (!clientRef.current) {
				return;
			}

			try {
				await clientRef.current.kill(liveQueryId);
				clientRef.current.offLiveQuery(liveQueryId);

				// Remove from our tracking
				for (const [key, id] of liveQueriesRef.current.entries()) {
					if (id === liveQueryId) {
						liveQueriesRef.current.delete(key);
						break;
					}
				}

				console.log("🔹 Unsubscribed from live query:", liveQueryId);
			} catch (err) {
				console.error("🔸 Error unsubscribing from live query:", err);
			}
		},
		[],
	);

	useEffect(() => {
		isMountedRef.current = true;
		connect();

		return () => {
			isMountedRef.current = false;
			disconnect();
		};
	}, [connect, disconnect]);

	return {
		isConnected,
		error,
		reconnect,
		subscribeToChannels,
		subscribeToVoiceSessions,
		unsubscribe,
	};
}

// Specialized hook for channel updates
export function useChannelLiveQuery(
	initialChannels: unknown[],
	initialTotal: number,
) {
	const [channels, setChannels] = useState(initialChannels);
	const [total, setTotal] = useState(initialTotal);
	const liveQueryIdRef = useRef<string | null>(null);

	const { isConnected, error, reconnect, subscribeToChannels, unsubscribe } =
		useDirectWebSocket({
			onChannelUpdate: (event) => {
				if (event.action && event.result) {
					const { action, result } = event;

					setChannels((prevChannels) => {
						switch (action) {
							case "CREATE": {
								const newChannels = [...prevChannels, result].sort(
									(a: unknown, b: unknown) =>
										(a as { position: number }).position -
										(b as { position: number }).position,
								);
								setTotal(newChannels.length);
								return newChannels;
							}

							case "UPDATE": {
								return prevChannels
									.map((c: unknown) =>
										(c as { id: string }).id === (result as { id: string }).id
											? result
											: c,
									)
									.sort(
										(a: unknown, b: unknown) =>
											(a as { position: number }).position -
											(b as { position: number }).position,
									);
							}

							case "DELETE": {
								const filteredChannels = prevChannels.filter(
									(c: unknown) =>
										(c as { id: string }).id !== (result as { id: string }).id,
								);
								setTotal(filteredChannels.length);
								return filteredChannels;
							}

							default:
								return prevChannels;
						}
					});
				}
			},
		});

	useEffect(() => {
		if (isConnected && subscribeToChannels) {
			const guildId = process.env.NEXT_PUBLIC_GUILD_ID || "1254694808228986912";

			subscribeToChannels(guildId, () => {
				// This will be handled by the onChannelUpdate callback above
			})
				.then((liveQueryId) => {
					liveQueryIdRef.current = liveQueryId;
				})
				.catch(console.error);
		}

		return () => {
			if (liveQueryIdRef.current && unsubscribe) {
				unsubscribe(liveQueryIdRef.current);
			}
		};
	}, [isConnected, subscribeToChannels, unsubscribe]);

	return {
		channels,
		total,
		isConnected,
		error,
		reconnect,
	};
}
