import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { createOrUpdateUser } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
	debug: true, // Enable debug mode
	providers: [
		Discord({
			clientId: process.env.DISCORD_CLIENT_ID || "",
			clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
		}),
	],
	callbacks: {
		async jwt({ token, account, profile }) {
			if (account && profile) {
				token.discordId = profile.id;
				token.username = profile.username;
				token.displayName = profile.global_name || profile.username;
				token.discriminator = profile.discriminator || "0";
				token.avatar = profile.avatar;
			}
			return token;
		},
		async session({ session, token }) {
			if (token.discordId) {
				session.user.discordId = token.discordId as string;
				session.user.username = token.username as string;
				session.user.displayName = token.displayName as string;
				session.user.discriminator = token.discriminator as string;
				session.user.avatar = token.avatar as string;
			}
			return session;
		},
		async signIn({ account, profile }) {
			if (account?.provider === "discord" && profile) {
				try {
					// Check if user is a member of our Discord server
					const guildId = process.env.DISCORD_SERVER_ID;
					if (!guildId) {
						console.error("DISCORD_SERVER_ID not configured");
						return false;
					}

					// Fetch user's guild membership
					const guildMemberResponse = await fetch(
						`https://discord.com/api/guilds/${guildId}/members/${profile.id}`,
						{
							headers: {
								Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
							},
						},
					);

					if (!guildMemberResponse.ok) {
						console.log(
							`User ${profile.username} is not a member of the Discord server`,
						);
						return false;
					}

					const guildMember = await guildMemberResponse.json();

					// Create or update user in database
					await createOrUpdateUser({
						discordId: profile.id as string,
						guildId: guildId,
						username: profile.username as string,
						displayName: (profile.global_name || profile.username) as string,
						discriminator: (profile.discriminator as string) || "0",
						avatar: (profile.avatar as string) || "",
						roles: guildMember.roles || [],
					});

					return true;
				} catch (error) {
					console.error("Error during Discord sign-in:", error);
					return false;
				}
			}
			return true;
		},
	},
	pages: {
		signIn: "/login",
	},
	secret: process.env.AUTH_SECRET,
});
