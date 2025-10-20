// TypeScript types matching the bot's SurrealDB schema
// Based on /home/ln64/Source/arcados-bot/src/types/database.ts

// Guild Table
export interface Guild {
	id: string;
	name: string;
	ownerId: string;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// Action Table
export interface Action {
	id: string;
	guildId: string;
	userId: string;
	actionType: string;
	targetId?: string;
	reason?: string;
	executed: boolean;
	executedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

// User/Member Table
export interface User {
	id: string;
	guildId: string;
	userId: string;
	username: string;
	displayName: string;
	globalName?: string;
	avatar?: string;
	discriminator: string;
	nickname?: string;
	joinedAt: Date;
	roles: string[];
	profileHash: string;
	profileHistory: object[];
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Channel {
	id: string;
	guildId: string;
	name: string;
	type: number;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// Legacy interface for backward compatibility
export interface LegacyChannel {
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

// Voice State Table - Real-time state tracking
export interface VoiceState {
	id: string;
	guildId: string;
	userId: string;
	channelId?: string; // NONE when user leaves voice
	selfMute: boolean;
	selfDeaf: boolean;
	serverMute: boolean;
	serverDeaf: boolean;
	streaming: boolean;
	selfVideo: boolean;
	suppress: boolean;
	sessionId?: string;
	joinedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

// Voice History Table - Event logging
export interface VoiceHistory {
	id: string;
	guildId: string;
	userId: string;
	channelId?: string;
	eventType: string;
	fromChannelId?: string;
	toChannelId?: string;
	selfMute: boolean;
	selfDeaf: boolean;
	serverMute: boolean;
	serverDeaf: boolean;
	streaming: boolean;
	selfVideo: boolean;
	sessionId?: string;
	sessionDuration?: number;
	timestamp: Date;
	createdAt: Date;
}

// Voice Sessions Table - Session management
export interface VoiceSession {
	id: string;
	guildId: string;
	userId: string;
	channelId: string;
	joinedAt: Date;
	leftAt?: Date;
	duration: number;
	channelsVisited: string[];
	switchCount: number;
	timeMuted: number;
	timeDeafened: number;
	timeStreaming: number;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

// Legacy interface for backward compatibility
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

// SSE Event types
export interface SSEEvent {
	event: string;
	data: unknown;
	timestamp: number;
}

export interface SSEConnectionOptions {
	channel: string;
	guildId?: string;
	channelId?: string;
	onMessage?: (event: SSEEvent) => void;
	onError?: (error: Error) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	reconnectDelay?: number;
	maxReconnectAttempts?: number;
}

// WebSocket Message types
export interface WebSocketMessage {
	id?: string;
	method: string;
	params: unknown[];
}

export interface WebSocketResponse {
	id?: string;
	result?: unknown;
	error?: {
		code: number;
		message: string;
	};
}

export interface WebSocketNotification {
	method: "notify";
	params: [string, { action: "CREATE" | "UPDATE" | "DELETE"; result: unknown }];
}

// Subscription configuration types
export interface SubscriptionConfig {
	query: string;
	params?: Record<string, unknown>;
	intervalMs?: number;
	onUpdate?: (data: LiveQueryEvent) => void;
	onError?: (error: Error) => void;
}

export interface ChannelSubscriptionConfig extends SubscriptionConfig {
	guildId: string;
}

export interface VoiceSessionSubscriptionConfig extends SubscriptionConfig {
	channelId?: string;
}

export interface MemberSubscriptionConfig extends SubscriptionConfig {
	guildId: string;
}

export interface MessageSubscriptionConfig extends SubscriptionConfig {
	channelId: string;
	limit?: number;
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
