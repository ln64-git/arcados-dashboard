import "server-only";
import { SurrealWebSocketClient } from "./SurrealWebSocketClient";
import type { LiveQueryEvent } from "./types";

export class SurrealLiveQueries {
	private liveQueries: Map<string, string> = new Map(); // query key -> live query ID
	private callbacks: Map<string, (data: LiveQueryEvent) => void> = new Map();
	private wsClient: SurrealWebSocketClient | null = null;

	/**
	 * Initialize the live queries manager
	 */
	async initialize(): Promise<void> {
		// Create WebSocket client for live queries
		this.wsClient = new SurrealWebSocketClient();
		await this.wsClient.connect();
		console.log("🔹 SurrealDB Live Queries initialized with WebSocket client");
	}

	// ==================== VOICE SESSION LIVE QUERIES ====================

	/**
	 * Subscribe to voice session changes for a specific channel
	 */
	async subscribeToChannelVoiceSessions(
		channelId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
      LIVE SELECT * FROM voice_channel_sessions 
      WHERE channel_id = $channel_id AND is_active = true
    `;

		const liveQueryId = await this.wsClient.live(query, {
			channel_id: channelId,
		});
		const queryKey = `channel_voice_sessions_${channelId}`;

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		// Set up callback in the WebSocket client
		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to voice sessions for channel ${channelId}`);
		return liveQueryId;
	}

	/**
	 * Subscribe to all active voice sessions across all channels
	 */
	async subscribeToAllVoiceSessions(
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
      LIVE SELECT * FROM voice_channel_sessions 
      WHERE is_active = true
    `;

		const liveQueryId = await this.wsClient.live(query, {});
		const queryKey = "all_voice_sessions";

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log("🔹 Subscribed to all active voice sessions");
		return liveQueryId;
	}

	/**
	 * Subscribe to voice session changes for a specific user
	 */
	async subscribeToUserVoiceSessions(
		userId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
      LIVE SELECT * FROM voice_channel_sessions 
      WHERE user_id = $user_id AND is_active = true
    `;

		const liveQueryId = await this.wsClient.live(query, { user_id: userId });
		const queryKey = `user_voice_sessions_${userId}`;

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to voice sessions for user ${userId}`);
		return liveQueryId;
	}

	// ==================== CHANNEL LIVE QUERIES ====================

	/**
	 * Subscribe to channel member count changes
	 */
	async subscribeToChannelMembers(
		channelId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
             LIVE SELECT * FROM channels 
             WHERE discordId = $discordId
           `;

		const liveQueryId = await this.wsClient.live(query, {
			discordId: channelId,
		});
		const queryKey = `channel_members_${channelId}`;

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to channel members for ${channelId}`);
		return liveQueryId;
	}

	/**
	 * Subscribe to all active channels in a guild
	 */
	async subscribeToGuildChannels(
		guildId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
             LIVE SELECT * FROM channels 
             WHERE guildId = $guildId AND isActive = true
           `;

		const liveQueryId = await this.wsClient.live(query, { guildId: guildId });
		const queryKey = `guild_channels_${guildId}`;

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to channels for guild ${guildId}`);
		return liveQueryId;
	}

	// ==================== USER LIVE QUERIES ====================

	/**
	 * Subscribe to user moderation preferences changes
	 */
	async subscribeToUserModPreferences(
		userId: string,
		guildId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
      LIVE SELECT mod_preferences FROM users 
      WHERE discord_id = $discord_id AND guild_id = $guild_id
    `;

		const liveQueryId = await this.wsClient.live(query, {
			discord_id: userId,
			guild_id: guildId,
		});
		const queryKey = `user_mod_preferences_${userId}_${guildId}`;

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to mod preferences for user ${userId}`);
		return liveQueryId;
	}

	/**
	 * Subscribe to user voice interaction history changes
	 */
	async subscribeToUserVoiceInteractions(
		userId: string,
		guildId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
      LIVE SELECT voice_interactions FROM users 
      WHERE discord_id = $discord_id AND guild_id = $guild_id
    `;

		const liveQueryId = await this.wsClient.live(query, {
			discord_id: userId,
			guild_id: guildId,
		});
		const queryKey = `user_voice_interactions_${userId}_${guildId}`;

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to voice interactions for user ${userId}`);
		return liveQueryId;
	}

	// ==================== MESSAGE LIVE QUERIES ====================

	/**
	 * Subscribe to new messages in a channel
	 */
	async subscribeToChannelMessages(
		channelId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
      LIVE SELECT * FROM messages 
      WHERE channel_id = $channel_id
      ORDER BY timestamp DESC
      LIMIT 50
    `;

		const liveQueryId = await this.wsClient.live(query, {
			channel_id: channelId,
		});
		const queryKey = `channel_messages_${channelId}`;

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to messages for channel ${channelId}`);
		return liveQueryId;
	}

	/**
	 * Subscribe to new messages in a guild
	 */
	async subscribeToGuildMessages(
		guildId: string,
		callback: (data: LiveQueryEvent) => void,
	): Promise<string> {
		if (!this.wsClient) {
			throw new Error("WebSocket client not initialized");
		}

		const query = `
      LIVE SELECT * FROM messages 
      WHERE guild_id = $guild_id
      ORDER BY timestamp DESC
      LIMIT 100
    `;

		const liveQueryId = await this.wsClient.live(query, { guild_id: guildId });
		const queryKey = `guild_messages_${guildId}`;

		this.liveQueries.set(queryKey, liveQueryId);
		this.callbacks.set(queryKey, callback);

		this.wsClient.onLiveQuery(liveQueryId, callback);

		console.log(`🔹 Subscribed to messages for guild ${guildId}`);
		return liveQueryId;
	}

	// ==================== QUERY MANAGEMENT ====================

	/**
	 * Unsubscribe from a live query
	 */
	async unsubscribe(queryKey: string): Promise<void> {
		if (!this.wsClient) {
			return;
		}

		const liveQueryId = this.liveQueries.get(queryKey);
		if (liveQueryId) {
			await this.wsClient.kill(liveQueryId);
			this.wsClient.offLiveQuery(liveQueryId);
			this.liveQueries.delete(queryKey);
			this.callbacks.delete(queryKey);
			console.log(`🔹 Unsubscribed from live query: ${queryKey}`);
		}
	}

	/**
	 * Unsubscribe from all live queries
	 */
	async unsubscribeAll(): Promise<void> {
		if (!this.wsClient) {
			return;
		}

		for (const [queryKey, liveQueryId] of Array.from(
			this.liveQueries.entries(),
		)) {
			try {
				await this.wsClient.kill(liveQueryId);
				this.wsClient.offLiveQuery(liveQueryId);
				console.log(`🔹 Unsubscribed from live query: ${queryKey}`);
			} catch (error) {
				console.warn(`🔸 Failed to unsubscribe from ${queryKey}:`, error);
			}
		}

		this.liveQueries.clear();
		this.callbacks.clear();
		console.log("🔹 Unsubscribed from all live queries");
	}

	/**
	 * Get list of active live queries
	 */
	getActiveQueries(): string[] {
		return Array.from(this.liveQueries.keys());
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		await this.unsubscribeAll();
		if (this.wsClient) {
			await this.wsClient.close();
			this.wsClient = null;
		}
		console.log("🔹 SurrealDB Live Queries cleaned up");
	}
}
