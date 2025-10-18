"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSurrealLiveQuery } from "@/hooks/useSurrealLiveQuery";

export function WSRefresher({ channelId }: { channelId: string }) {
	const router = useRouter();
	const { subscribeToVoiceSessions, isConnected, error } = useSurrealLiveQuery({
		onVoiceSessionUpdate: (event) => {
			console.log("🔹 Voice session update received:", event.action, event.result);
			
			// Check if this update is for our channel
			const sessionData = event.result as any;
			if (sessionData.channelId === channelId) {
				console.log("🔹 Channel data updated for:", channelId);
				router.refresh();
			}
		},
		onError: (error) => {
			console.error("🔸 Channel SSE connection error:", error);
		},
		onConnect: () => {
			console.log("🔹 Channel SSE connected for voice sessions");
		},
		onDisconnect: () => {
			console.log("🔸 Channel SSE disconnected from voice sessions");
		},
	});

	useEffect(() => {
		if (!isConnected) {
			console.warn("🔸 Not connected to SSE, skipping voice session subscription");
			return;
		}

		let voiceSessionsSubscriptionId: string | null = null;

		const setupSubscription = async () => {
			try {
				// Subscribe to voice sessions for this specific channel
				voiceSessionsSubscriptionId = await subscribeToVoiceSessions(channelId, () => {
					// Callback is handled by onVoiceSessionUpdate
				});

				console.log(`🔹 Subscribed to voice sessions for channel ${channelId}`);
			} catch (error) {
				console.error("🔸 Error setting up voice session subscription:", error);
			}
		};

		setupSubscription();

		return () => {
			// Cleanup subscription
			if (voiceSessionsSubscriptionId) {
				console.log(`🔹 Cleaning up voice session subscription for channel ${channelId}`);
			}
		};
	}, [channelId, isConnected, subscribeToVoiceSessions]);

	if (error) {
		console.error("🔸 Channel SSE Refresher error:", error);
	}

	return null;
}
