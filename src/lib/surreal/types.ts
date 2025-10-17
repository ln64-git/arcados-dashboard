// TypeScript types matching the bot's SurrealDB schema
// Based on /home/ln64/Source/arcados-bot/src/types/database.ts

export interface User {
	id: string;
	discordId: string;
	guildId: string;
	bot: boolean;
	username: string;
	displayName: string;
	nickname?: string;
	discriminator: string;
	avatar?: string;
	status: string;
	roles: string[];
	joinedAt: Date;
	lastSeen: Date;
	avatarHistory: AvatarHistory[];
	usernameHistory: string[];
	displayNameHistory: string[];
	nicknameHistory: string[];
	statusHistory: UserStatus[];
	emoji?: string;
	title?: string;
	summary?: string;
	keywords: string[];
	notes: string[];
	relationships: Relationship[];
	modPreferences: ModPreferences;
	voiceInteractions: VoiceInteraction[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Channel {
	id: string;
	discordId: string;
	guildId: string;
	channelName: string;
	position: number;
	isActive: boolean;
	activeUserIds: string[];
	memberCount: number;
	status: string;
	lastStatusChange?: Date;
	type: string;
	topic?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface VoiceChannelSession {
	id: string;
	userId: string;
	guildId: string;
	channelId: string;
	channelName: string;
	joinedAt: Date;
	leftAt?: Date;
	duration?: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Message {
	id: string;
	discordId: string;
	content: string;
	authorId: string;
	channelId: string;
	guildId: string;
	timestamp: Date;
	editedAt?: Date;
	deletedAt?: Date;
	mentions: string[];
	reactions: Reaction[];
	replyTo?: string;
	attachments: Attachment[];
	embeds: Embed[];
	flags?: number;
	type?: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface Role {
	id: string;
	discordId: string;
	guildId: string;
	name: string;
	color: number;
	mentionable: boolean;
	permissions: string;
	position: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface Relationship {
	userId: string;
	targetUserId: string;
	guildId: string;
	type: "friend" | "blocked" | "muted" | "other";
	strength: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface VoiceInteraction {
	channelId: string;
	channelName: string;
	joinedAt: Date;
	leftAt?: Date;
	duration?: number;
}

export interface ModPreferences {
	bannedUsers: string[];
	mutedUsers: string[];
	kickedUsers: string[];
	deafenedUsers: string[];
	renamedUsers: RenamedUser[];
	modHistory: ModHistoryEntry[];
	lastUpdated: Date;
}

export interface AvatarHistory {
	url: string;
	timestamp: Date;
}

export interface UserStatus {
	status: string;
	timestamp: Date;
}

export interface RenamedUser {
	oldName: string;
	newName: string;
	timestamp: Date;
}

export interface ModHistoryEntry {
	action: string;
	moderator: string;
	reason?: string;
	timestamp: Date;
}

export interface Reaction {
	emoji: string;
	count: number;
	users: string[];
}

export interface Attachment {
	id: string;
	filename: string;
	url: string;
	size: number;
	contentType: string;
}

export interface Embed {
	title?: string;
	description?: string;
	url?: string;
	color?: number;
	fields: EmbedField[];
	thumbnail?: EmbedImage;
	image?: EmbedImage;
	footer?: EmbedFooter;
	timestamp?: Date;
}

export interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface EmbedImage {
	url: string;
	width?: number;
	height?: number;
}

export interface EmbedFooter {
	text: string;
	iconUrl?: string;
}

// SurrealDB Live Query event types
export interface LiveQueryEvent<T = unknown> {
	action: "CREATE" | "UPDATE" | "DELETE";
	result: T;
}

// API Response types for backward compatibility
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

export interface ChannelsResponse {
	channels: DiscordChannel[];
	totalChannels: number;
}
