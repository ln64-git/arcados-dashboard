/**
 * Discord API utilities for fetching user information
 */

interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	display_name?: string;
	global_name?: string;
}

interface DiscordGuildMember {
	user: DiscordUser;
	nick?: string;
	avatar?: string | null;
}

/**
 * Fetch Discord user information by user ID
 * Note: This requires Discord bot token and guild ID
 */
export async function fetchDiscordUser(
	userId: string,
	guildId: string,
): Promise<DiscordUser | null> {
	try {
		const botToken = process.env.DISCORD_BOT_TOKEN;
		if (!botToken) {
			console.warn(
				"🔸 DISCORD_BOT_TOKEN not configured, using fallback user data",
			);
			return null;
		}

		// Try to get guild member first (includes nickname)
		const memberResponse = await fetch(
			`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
			{
				headers: {
					Authorization: `Bot ${botToken}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (memberResponse.ok) {
			const member: DiscordGuildMember = await memberResponse.json();
			return {
				id: member.user.id,
				username: member.user.username,
				discriminator: member.user.discriminator,
				avatar: member.avatar || member.user.avatar,
				display_name:
					member.nick || member.user.global_name || member.user.display_name,
			};
		}

		// Fallback to user endpoint if guild member not found
		const userResponse = await fetch(
			`https://discord.com/api/v10/users/${userId}`,
			{
				headers: {
					Authorization: `Bot ${botToken}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (userResponse.ok) {
			const user: DiscordUser = await userResponse.json();
			return user;
		}

		console.warn(
			`🔸 Failed to fetch Discord user ${userId}: ${userResponse.status}`,
		);
		return null;
	} catch (error) {
		console.error(`🔸 Error fetching Discord user ${userId}:`, error);
		return null;
	}
}

/**
 * Fetch multiple Discord users by their IDs
 */
export async function fetchDiscordUsers(
	userIds: string[],
	guildId: string,
): Promise<Map<string, DiscordUser>> {
	const userMap = new Map<string, DiscordUser>();

	// Process in batches to avoid rate limits
	const batchSize = 10;
	for (let i = 0; i < userIds.length; i += batchSize) {
		const batch = userIds.slice(i, i + batchSize);
		const promises = batch.map((userId) => fetchDiscordUser(userId, guildId));

		try {
			const results = await Promise.all(promises);
			results.forEach((user, index) => {
				if (user) {
					userMap.set(batch[index], user);
				}
			});
		} catch (error) {
			console.error(`🔸 Error fetching Discord user batch:`, error);
		}

		// Small delay between batches to respect rate limits
		if (i + batchSize < userIds.length) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	return userMap;
}

/**
 * Generate Discord avatar URL
 */
export function getDiscordAvatarUrl(
	userId: string,
	avatarHash: string | null,
	discriminator: string,
): string | null {
	if (!avatarHash) {
		// Use default avatar based on discriminator
		const defaultAvatar = parseInt(discriminator) % 5;
		return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
	}

	// Determine if it's a GIF (starts with 'a_')
	const format = avatarHash.startsWith("a_") ? "gif" : "png";
	return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}`;
}

/**
 * Get display name for a Discord user
 */
export function getDisplayName(user: DiscordUser): string {
	return user.display_name || user.global_name || user.username;
}
