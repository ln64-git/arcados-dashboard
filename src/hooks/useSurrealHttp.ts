"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SurrealHttpClient } from "../lib/surreal/SurrealHttpClient";

export interface LiveQueryEvent<T = unknown> {
	action: "CREATE" | "UPDATE" | "DELETE";
	result: T;
}

export interface UseSurrealHttpOptions {
	onChannelUpdate?: (event: LiveQueryEvent) => void;
	onVoiceSessionUpdate?: (event: LiveQueryEvent) => void;
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	pollingInterval?: number; // Polling interval in milliseconds
}

export interface UseSurrealHttpReturn {
	isConnected: boolean;
	error: string | null;
	reconnect: () => Promise<void>;
	subscribeToChannels: (
		guildId: string,
		callback: (event: LiveQueryEvent) => void,
	) => Promise<string>;
	subscribeToVoiceSessions: (
		callback: (event: LiveQueryEvent) => void,
	) => Promise<string>;
	unsubscribe: (liveQueryId: string) => Promise<void>;
}

export function useSurrealHttp(
	options: UseSurrealHttpOptions = {},
): UseSurrealHttpReturn {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const clientRef = useRef<SurrealHttpClient | null>(null);
	const liveQueriesRef = useRef<Map<string, string>>(new Map()); // query key -> live query ID
	const isMountedRef = useRef(true);
	const optionsRef = useRef(options);

	// Update options ref when options change
	useEffect(() => {
		optionsRef.current = options;
	}, [options]);

	const connect = useCallback(async () => {
		if (clientRef.current?.isConnected) return;

		try {
			console.log("🔹 Creating SurrealDB HTTP client...");
			clientRef.current = new SurrealHttpClient({
				onChannelUpdate: optionsRef.current.onChannelUpdate,
				onVoiceSessionUpdate: optionsRef.current.onVoiceSessionUpdate,
				onError: (err) => {
					console.error("🔸 SurrealDB HTTP error:", err);
					if (isMountedRef.current) {
						setError(err.message);
					}
					if (optionsRef.current.onError) {
						optionsRef.current.onError(err);
					}
				},
				onConnect: () => {
					console.log("🔹 SurrealDB HTTP connected");
					if (isMountedRef.current) {
						setIsConnected(true);
						setError(null);
					}
					if (optionsRef.current.onConnect) {
						optionsRef.current.onConnect();
					}
				},
				onDisconnect: () => {
					console.log("🔸 SurrealDB HTTP disconnected");
					if (isMountedRef.current) {
						setIsConnected(false);
					}
					if (optionsRef.current.onDisconnect) {
						optionsRef.current.onDisconnect();
					}
				},
			});

			await clientRef.current.connect();
		} catch (err) {
			console.error("🔸 Failed to connect SurrealDB HTTP:", err);
			if (isMountedRef.current) {
				setError(err instanceof Error ? err.message : "Connection failed");
			}
		}
	}, []); // Remove options dependency

	const disconnect = useCallback(async () => {
		if (clientRef.current) {
			console.log("🔹 Disconnecting SurrealDB HTTP...");
			await clientRef.current.disconnect();
			clientRef.current = null;
		}
		setIsConnected(false);
		liveQueriesRef.current.clear();
	}, []);

	const reconnect = useCallback(async () => {
		console.log("🔹 Reconnecting SurrealDB HTTP...");
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
				throw new Error("SurrealDB HTTP client not connected");
			}

			const queryKey = `guild_channels_${guildId}`;

			// Transform array results to individual events
			const wrappedCallback = (data: unknown[]) => {
				data.forEach((item) => {
					const event: LiveQueryEvent = {
						action: "UPDATE", // HTTP polling doesn't distinguish between CREATE/UPDATE/DELETE
						result: item,
					};
					callback(event);
				});
			};

			const liveQueryId = await clientRef.current.subscribeToGuildChannels(
				guildId,
				wrappedCallback,
				optionsRef.current.pollingInterval || 2000,
			);
			liveQueriesRef.current.set(queryKey, liveQueryId);

			return liveQueryId;
		},
		[],
	);

	const subscribeToVoiceSessions = useCallback(
		async (callback: (event: LiveQueryEvent) => void): Promise<string> => {
			if (!clientRef.current) {
				throw new Error("SurrealDB HTTP client not connected");
			}

			const queryKey = "all_voice_sessions";

			// Transform array results to individual events
			const wrappedCallback = (data: unknown[]) => {
				data.forEach((item) => {
					const event: LiveQueryEvent = {
						action: "UPDATE", // HTTP polling doesn't distinguish between CREATE/UPDATE/DELETE
						result: item,
					};
					callback(event);
				});
			};

			const liveQueryId = await clientRef.current.subscribeToAllVoiceSessions(
				wrappedCallback,
				optionsRef.current.pollingInterval || 2000,
			);
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
				await clientRef.current.stopLiveQuery(liveQueryId);

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
	_initialTotal: number,
) {
	const [channels, setChannels] = useState(initialChannels);
	const [isLoading, setIsLoading] = useState(false);

	const { subscribeToChannels, unsubscribe, isConnected, error } =
		useSurrealHttp({
			onChannelUpdate: (event) => {
				console.log("🔹 Channel update received:", event);
				setChannels((prev) => {
					// Simple update logic - in a real app you'd want more sophisticated diffing
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
				console.warn("🔸 Not connected to SurrealDB");
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
