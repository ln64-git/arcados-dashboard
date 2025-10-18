import { createSSEConnection, type SSEConnection } from "./sse-utils";
import type {
	ChannelSubscriptionConfig,
	LiveQueryEvent,
	MemberSubscriptionConfig,
	MessageSubscriptionConfig,
	SSEConnectionOptions,
	VoiceSessionSubscriptionConfig,
} from "./types";

export interface LiveQueryHelpers {
	subscribeToChannels: (
		guildId: string,
		callback: (event: LiveQueryEvent) => void,
	) => Promise<SSEConnection>;
	subscribeToVoiceSessions: (
		channelId?: string,
		callback?: (event: LiveQueryEvent) => void,
	) => Promise<SSEConnection>;
	subscribeToMembers: (
		guildId: string,
		callback: (event: LiveQueryEvent) => void,
	) => Promise<SSEConnection>;
	subscribeToMessages: (
		channelId: string,
		callback: (event: LiveQueryEvent) => void,
	) => Promise<SSEConnection>;
}

/**
 * Subscribe to channel updates for a specific guild
 */
export async function subscribeToChannels(
	guildId: string,
	callback: (event: LiveQueryEvent) => void,
): Promise<SSEConnection> {
	const options: SSEConnectionOptions = {
		channel: "channels",
		guildId,
		onMessage: (event) => {
			if (event.event === "update") {
				const liveQueryEvent: LiveQueryEvent = {
					action: event.data.action,
					result: event.data.data,
				};
				callback(liveQueryEvent);
			}
		},
		onError: (error) => {
			console.error("🔸 Channel subscription error:", error);
		},
		onConnect: () => {
			console.log(`🔹 Subscribed to channels for guild ${guildId}`);
		},
		onDisconnect: () => {
			console.log(`🔸 Disconnected from channels for guild ${guildId}`);
		},
	};

	const connection = createSSEConnection(options);
	await connection.connect();
	return connection;
}

/**
 * Subscribe to voice session updates
 */
export async function subscribeToVoiceSessions(
	channelId?: string,
	callback?: (event: LiveQueryEvent) => void,
): Promise<SSEConnection> {
	const options: SSEConnectionOptions = {
		channel: "voice_sessions",
		channelId,
		onMessage: (event) => {
			if (event.event === "update" && callback) {
				const liveQueryEvent: LiveQueryEvent = {
					action: event.data.action,
					result: event.data.data,
				};
				callback(liveQueryEvent);
			}
		},
		onError: (error) => {
			console.error("🔸 Voice session subscription error:", error);
		},
		onConnect: () => {
			console.log(
				`🔹 Subscribed to voice sessions${channelId ? ` for channel ${channelId}` : " (all)"}`,
			);
		},
		onDisconnect: () => {
			console.log(
				`🔸 Disconnected from voice sessions${channelId ? ` for channel ${channelId}` : " (all)"}`,
			);
		},
	};

	const connection = createSSEConnection(options);
	await connection.connect();
	return connection;
}

/**
 * Subscribe to member updates for a specific guild
 */
export async function subscribeToMembers(
	guildId: string,
	callback: (event: LiveQueryEvent) => void,
): Promise<SSEConnection> {
	const options: SSEConnectionOptions = {
		channel: "members",
		guildId,
		onMessage: (event) => {
			if (event.event === "update") {
				const liveQueryEvent: LiveQueryEvent = {
					action: event.data.action,
					result: event.data.data,
				};
				callback(liveQueryEvent);
			}
		},
		onError: (error) => {
			console.error("🔸 Member subscription error:", error);
		},
		onConnect: () => {
			console.log(`🔹 Subscribed to members for guild ${guildId}`);
		},
		onDisconnect: () => {
			console.log(`🔸 Disconnected from members for guild ${guildId}`);
		},
	};

	const connection = createSSEConnection(options);
	await connection.connect();
	return connection;
}

/**
 * Subscribe to message updates for a specific channel
 */
export async function subscribeToMessages(
	channelId: string,
	callback: (event: LiveQueryEvent) => void,
): Promise<SSEConnection> {
	const options: SSEConnectionOptions = {
		channel: "messages",
		channelId,
		onMessage: (event) => {
			if (event.event === "update") {
				const liveQueryEvent: LiveQueryEvent = {
					action: event.data.action,
					result: event.data.data,
				};
				callback(liveQueryEvent);
			}
		},
		onError: (error) => {
			console.error("🔸 Message subscription error:", error);
		},
		onConnect: () => {
			console.log(`🔹 Subscribed to messages for channel ${channelId}`);
		},
		onDisconnect: () => {
			console.log(`🔸 Disconnected from messages for channel ${channelId}`);
		},
	};

	const connection = createSSEConnection(options);
	await connection.connect();
	return connection;
}

/**
 * Create a subscription manager for multiple subscriptions
 */
export class SubscriptionManager {
	private subscriptions = new Map<string, SSEConnection>();

	async subscribeToChannels(
		guildId: string,
		callback: (event: LiveQueryEvent) => void,
	): Promise<string> {
		const subscriptionId = `channels_${guildId}_${Date.now()}`;
		const connection = await subscribeToChannels(guildId, callback);
		this.subscriptions.set(subscriptionId, connection);
		return subscriptionId;
	}

	async subscribeToVoiceSessions(
		channelId?: string,
		callback?: (event: LiveQueryEvent) => void,
	): Promise<string> {
		const subscriptionId = `voice_sessions_${channelId || "all"}_${Date.now()}`;
		const connection = await subscribeToVoiceSessions(channelId, callback);
		this.subscriptions.set(subscriptionId, connection);
		return subscriptionId;
	}

	async subscribeToMembers(
		guildId: string,
		callback: (event: LiveQueryEvent) => void,
	): Promise<string> {
		const subscriptionId = `members_${guildId}_${Date.now()}`;
		const connection = await subscribeToMembers(guildId, callback);
		this.subscriptions.set(subscriptionId, connection);
		return subscriptionId;
	}

	async subscribeToMessages(
		channelId: string,
		callback: (event: LiveQueryEvent) => void,
	): Promise<string> {
		const subscriptionId = `messages_${channelId}_${Date.now()}`;
		const connection = await subscribeToMessages(channelId, callback);
		this.subscriptions.set(subscriptionId, connection);
		return subscriptionId;
	}

	async unsubscribe(subscriptionId: string): Promise<void> {
		const connection = this.subscriptions.get(subscriptionId);
		if (connection) {
			connection.disconnect();
			this.subscriptions.delete(subscriptionId);
			console.log("🔹 Unsubscribed:", subscriptionId);
		}
	}

	async unsubscribeAll(): Promise<void> {
		for (const [id, connection] of this.subscriptions.entries()) {
			connection.disconnect();
		}
		this.subscriptions.clear();
		console.log("🔹 Unsubscribed from all subscriptions");
	}

	getActiveSubscriptions(): string[] {
		return Array.from(this.subscriptions.keys());
	}

	getConnectionCount(): number {
		return this.subscriptions.size;
	}
}

/**
 * Create a new subscription manager instance
 */
export function createSubscriptionManager(): SubscriptionManager {
	return new SubscriptionManager();
}

/**
 * Helper function to create a typed subscription configuration
 */
export function createChannelSubscriptionConfig(
	guildId: string,
	callback: (event: LiveQueryEvent) => void,
): ChannelSubscriptionConfig {
	return {
		guildId,
		query: `SELECT * FROM channels WHERE guildId = $guildId`,
		params: { guildId },
		onUpdate: callback,
	};
}

export function createVoiceSessionSubscriptionConfig(
	channelId: string,
	callback: (event: LiveQueryEvent) => void,
): VoiceSessionSubscriptionConfig {
	return {
		channelId,
		query: `SELECT * FROM voice_sessions WHERE channelId = $channelId AND isActive = true`,
		params: { channelId },
		onUpdate: callback,
	};
}

export function createMemberSubscriptionConfig(
	guildId: string,
	callback: (event: LiveQueryEvent) => void,
): MemberSubscriptionConfig {
	return {
		guildId,
		query: `SELECT * FROM users WHERE guildId = $guildId`,
		params: { guildId },
		onUpdate: callback,
	};
}

export function createMessageSubscriptionConfig(
	channelId: string,
	callback: (event: LiveQueryEvent) => void,
	limit: number = 50,
): MessageSubscriptionConfig {
	return {
		channelId,
		limit,
		query: `SELECT * FROM messages WHERE channelId = $channelId ORDER BY timestamp DESC LIMIT $limit`,
		params: { channelId, limit },
		onUpdate: callback,
	};
}
