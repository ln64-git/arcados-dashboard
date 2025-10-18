"use client";

import { useEffect } from "react";
import { useSurrealLiveQuery } from "@/hooks/useSurrealLiveQuery";
import type { DiscordChannel } from "./channels-table";

export function WSRefresherChannels() {
	const { subscribeToChannels, subscribeToVoiceSessions, isConnected, error } = useSurrealLiveQuery({
		onChannelUpdate: (event) => {
			console.log("🔹 Channel update received:", event.action, event.result);
			
			// Transform SurrealDB channel to DiscordChannel format
			const channelData = event.result as any;
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
					action: event.action,
					channel: discordChannel,
					timestamp: Date.now()
				} 
			});
			window.dispatchEvent(evt);
		},
		onVoiceSessionUpdate: (event) => {
			console.log("🔹 Voice session update:", event.action, event.result);
			
			const evt = new CustomEvent('voice_sessions:update', { 
				detail: { 
					action: event.action,
					session: event.result,
					timestamp: Date.now()
				} 
			});
			window.dispatchEvent(evt);
		},
		onError: (error) => {
			console.error("🔸 SSE connection error:", error);
		},
		onConnect: () => {
			console.log("🔹 SSE connected for channels and voice sessions");
		},
		onDisconnect: () => {
			console.log("🔸 SSE disconnected from channels and voice sessions");
		},
	});

	useEffect(() => {
		if (!isConnected) {
			console.warn("🔸 Not connected to SSE, skipping subscriptions");
			return;
		}

		let channelsSubscriptionId: string | null = null;
		let voiceSessionsSubscriptionId: string | null = null;

		const setupSubscriptions = async () => {
			try {
				// Subscribe to channels (you'll need to get guildId from somewhere)
				// For now, using a placeholder - this should come from your app state
				const guildId = "your-guild-id"; // TODO: Get from context or props
				
				channelsSubscriptionId = await subscribeToChannels(guildId, () => {
					// Callback is handled by onChannelUpdate
				});

				// Subscribe to all voice sessions
				voiceSessionsSubscriptionId = await subscribeToVoiceSessions(undefined, () => {
					// Callback is handled by onVoiceSessionUpdate
				});

				console.log("🔹 Subscribed to channels and voice sessions");
			} catch (error) {
				console.error("🔸 Error setting up subscriptions:", error);
			}
		};

		setupSubscriptions();

		return () => {
			// Cleanup subscriptions
			if (channelsSubscriptionId) {
				// Note: unsubscribe would need to be implemented in the hook
				console.log("🔹 Cleaning up channels subscription");
			}
			if (voiceSessionsSubscriptionId) {
				console.log("🔹 Cleaning up voice sessions subscription");
			}
		};
	}, [isConnected, subscribeToChannels, subscribeToVoiceSessions]);

	if (error) {
		console.error("🔸 SSE Refresher error:", error);
	}

	return null;
}
