import "server-only";

import { neon } from "@neondatabase/serverless";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import {
	boolean,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const db = drizzle(neon(process.env.POSTGRES_URL || ""));

export const users = pgTable("users", {
	id: serial("id").primaryKey(),
	discordId: text("discord_id").notNull(),
	guildId: text("guild_id").notNull(),
	bot: text("bot").default("false"),
	username: text("username").notNull(),
	displayName: text("display_name").notNull(),
	nickname: text("nickname"), // Server-specific nickname
	discriminator: text("discriminator").notNull(),
	avatar: text("avatar"),
	status: text("status"),
	roles: text("roles").array(),
	joinedAt: timestamp("joined_at").notNull(),
	lastSeen: timestamp("last_seen").notNull(),
	avatarHistory: text("avatar_history"), // jsonb
	usernameHistory: text("username_history").array(),
	displayNameHistory: text("display_name_history").array(),
	statusHistory: text("status_history"), // jsonb
	emoji: text("emoji"),
	title: text("title"),
	summary: text("summary"),
	keywords: text("keywords").array(),
	notes: text("notes").array(),
	relationships: text("relationships"), // jsonb
	modPreferences: text("mod_preferences"), // jsonb
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export type SelectUser = typeof users.$inferSelect;
export const insertUserSchema = createInsertSchema(users);

export const channels = pgTable("channels", {
	id: serial("id").primaryKey(),
	discordId: text("discord_id").notNull(),
	guildId: text("guild_id").notNull(),
	channelName: text("channel_name").notNull(),
	position: integer("position").notNull(),
	isActive: boolean("is_active"),
	activeUserIds: text("active_user_ids").array(),
	memberCount: integer("member_count"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export type SelectChannel = typeof channels.$inferSelect;
export const insertChannelSchema = createInsertSchema(channels);

export async function getAllChannels(): Promise<SelectChannel[]> {
	const result = await db
		.select()
		.from(channels)
		.orderBy(asc(channels.position));
	return result;
}

export async function getChannelByDiscordId(
	discordId: string,
): Promise<SelectChannel | null> {
	const result = await db
		.select()
		.from(channels)
		.where(eq(channels.discordId, discordId))
		.limit(1);
	return result[0] || null;
}

export async function createOrUpdateChannel(channelData: {
	discordId: string;
	guildId: string;
	channelName: string;
	position: number;
	isActive?: boolean;
	activeUserIds?: string[];
	memberCount?: number;
}): Promise<SelectChannel> {
	const existingChannel = await getChannelByDiscordId(channelData.discordId);

	if (existingChannel) {
		// Update existing channel
		const [updatedChannel] = await db
			.update(channels)
			.set({
				channelName: channelData.channelName,
				position: channelData.position,
				isActive: channelData.isActive,
				activeUserIds: channelData.activeUserIds,
				memberCount: channelData.memberCount,
				updatedAt: new Date(),
			})
			.where(eq(channels.discordId, channelData.discordId))
			.returning();
		return updatedChannel;
	} else {
		// Create new channel
		const [newChannel] = await db
			.insert(channels)
			.values({
				discordId: channelData.discordId,
				guildId: channelData.guildId,
				channelName: channelData.channelName,
				position: channelData.position,
				isActive: channelData.isActive,
				activeUserIds: channelData.activeUserIds,
				memberCount: channelData.memberCount,
			})
			.returning();
		return newChannel;
	}
}

export async function getUserByDiscordId(
	discordId: string,
): Promise<SelectUser | null> {
	const result = await db
		.select()
		.from(users)
		.where(eq(users.discordId, discordId))
		.limit(1);
	return result[0] || null;
}

export async function createOrUpdateUser(userData: {
	discordId: string;
	guildId: string;
	username: string;
	displayName: string;
	nickname?: string;
	discriminator: string;
	avatar?: string;
	roles?: string[];
}): Promise<SelectUser> {
	const existingUser = await getUserByDiscordId(userData.discordId);

	if (existingUser) {
		// Update existing user
		const [updatedUser] = await db
			.update(users)
			.set({
				username: userData.username,
				displayName: userData.displayName,
				nickname: userData.nickname,
				discriminator: userData.discriminator,
				avatar: userData.avatar,
				roles: userData.roles,
				lastSeen: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(users.discordId, userData.discordId))
			.returning();
		return updatedUser;
	} else {
		// Create new user
		const [newUser] = await db
			.insert(users)
			.values({
				discordId: userData.discordId,
				guildId: userData.guildId,
				username: userData.username,
				displayName: userData.displayName,
				nickname: userData.nickname,
				discriminator: userData.discriminator,
				avatar: userData.avatar,
				roles: userData.roles,
				joinedAt: new Date(),
				lastSeen: new Date(),
			})
			.returning();
		return newUser;
	}
}
