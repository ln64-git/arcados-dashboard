import "server-only";

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const db = drizzle(neon(process.env.POSTGRES_URL || ""));

export const users = pgTable("users", {
	id: serial("id").primaryKey(),
	discordId: text("discord_id").notNull(),
	guildId: text("guild_id").notNull(),
	bot: text("bot").default("false"),
	username: text("username").notNull(),
	displayName: text("display_name").notNull(),
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
