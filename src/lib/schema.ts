// Re-export SurrealDB types for backward compatibility
export type {
	Attachment,
	AvatarHistory,
	Channel,
	ChannelsResponse,
	DiscordChannel,
	Embed,
	EmbedField,
	EmbedFooter,
	EmbedImage,
	LiveQueryEvent,
	Message,
	ModHistoryEntry,
	ModPreferences,
	Reaction,
	Relationship,
	RenamedUser,
	Role,
	User,
	UserStatus,
	VoiceChannelSession,
	VoiceInteraction,
} from "./surreal/types";

// Legacy type aliases for backward compatibility
export type SelectUser = User;
export type SelectChannel = Channel;
export type SelectMessage = Message;
export type SelectRole = Role;

// Legacy interface for backward compatibility
export interface DiscordChannel {
	id: string;
	name: string;
	status: string | null;
	type: number;
	position: number;
	userLimit: number;
	bitrate: number;
	parentId: string | null;
	permissionOverwrites: unknown[];
	memberCount: number;
}

// Helper functions for data transformation
export function transformSurrealChannelToDiscordChannel(
	channel: Channel,
): DiscordChannel {
	return {
		id: channel.discordId,
		name: channel.channelName,
		status: channel.status ?? null,
		type: 2, // Voice channel type
		position: channel.position,
		userLimit: 0, // Default unlimited
		bitrate: 64000, // Default bitrate
		parentId: null, // Default no parent
		permissionOverwrites: [], // Default empty
		memberCount: channel.memberCount || 0,
	};
}

export function transformSurrealUserToLegacyUser(user: User) {
	return {
		id: user.discordId,
		username: user.username,
		displayName: user.displayName,
		nickname: user.nickname,
		discriminator: user.discriminator,
		avatar: user.avatar,
		status: user.status,
		roles: user.roles,
		joinedAt: user.joinedAt,
		lastSeen: user.lastSeen,
		voiceInteractions: user.voiceInteractions,
	};
}
