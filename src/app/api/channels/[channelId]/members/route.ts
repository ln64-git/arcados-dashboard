import { NextResponse } from "next/server";
import {
	fetchDiscordUsers,
	getDiscordAvatarUrl,
	getDisplayName,
} from "@/lib/discord-api";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ channelId: string }> },
) {
	try {
		const { channelId } = await params;
		const { searchParams } = new URL(request.url);
		const guildId =
			searchParams.get("guild_id") ||
			process.env.GUILD_ID ||
			"1254694808228986912";

		console.log(
			"🔹 Fetching members for channel:",
			channelId,
			"guild:",
			guildId,
		);

		const client = new SurrealWebSocketClient();
		await client.connect();

		// Get active voice states for this channel
		const voiceStates = await client.query(
			`SELECT * FROM voice_states WHERE channel_id = $channelId AND guild_id = $guildId`,
			{ channelId, guildId },
		);

		await client.close();

		// Extract the actual data from the nested array structure
		const actualVoiceStates =
			Array.isArray(voiceStates) &&
			voiceStates.length > 0 &&
			Array.isArray(voiceStates[0])
				? voiceStates[0]
				: voiceStates;

		if (!Array.isArray(actualVoiceStates) || actualVoiceStates.length === 0) {
			return NextResponse.json({
				members: [],
				totalMembers: 0,
				channelId,
				guildId,
			});
		}

		// Extract unique user IDs
		const userIds = [
			...new Set(
				actualVoiceStates.map((vs: { user_id: string }) => vs.user_id),
			),
		];

		// Fetch Discord user information
		console.log("🔹 Fetching Discord user info for", userIds.length, "users");
		const discordUsers = await fetchDiscordUsers(userIds, guildId);

		// Map voice states to member data with Discord user info
		const members = actualVoiceStates.map(
			(vs: {
				user_id: string;
				joined_at?: string;
				created_at?: string;
				self_mute?: boolean;
				self_deaf?: boolean;
				server_mute?: boolean;
				server_deaf?: boolean;
				streaming?: boolean;
				self_video?: boolean;
				session_id?: string;
			}) => {
				const discordUser = discordUsers.get(vs.user_id);

				return {
					id: vs.user_id,
					username: discordUser?.username || `user_${vs.user_id.slice(-4)}`,
					displayName: discordUser
						? getDisplayName(discordUser)
						: `User ${vs.user_id.slice(-4)}`,
					avatar: discordUser
						? getDiscordAvatarUrl(
								discordUser.id,
								discordUser.avatar,
								discordUser.discriminator,
							)
						: null,
					discriminator: discordUser?.discriminator || "0000",
					joinedAt: vs.joined_at || vs.created_at,
					durationMs: vs.joined_at
						? Date.now() - new Date(vs.joined_at).getTime()
						: 0,
					selfMute: vs.self_mute || false,
					selfDeaf: vs.self_deaf || false,
					serverMute: vs.server_mute || false,
					serverDeaf: vs.server_deaf || false,
					streaming: vs.streaming || false,
					selfVideo: vs.self_video || false,
					sessionId: vs.session_id,
				};
			},
		);

		console.log(
			"🔹 Found",
			members.length,
			"active members in channel",
			channelId,
		);

		return NextResponse.json({
			members,
			totalMembers: members.length,
			channelId,
			guildId,
		});
	} catch (error) {
		console.error("🔸 Error fetching channel members:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch channel members",
				members: [],
				totalMembers: 0,
			},
			{ status: 500 },
		);
	}
}
