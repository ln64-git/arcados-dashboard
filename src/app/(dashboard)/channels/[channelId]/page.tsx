import { Volume2 } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";
import type { DiscordChannel } from "../../channels-table";
// eslint-disable-next-line import/no-unresolved
import { LiveChannelMembers } from "./live-channel-members";

export const dynamic = "force-dynamic";

interface ChannelMember {
	id: string;
	username: string;
	displayName: string;
	avatar: string | null;
	discriminator: string;
	joinedAt?: string | null;
	durationMs?: number;
	selfMute?: boolean;
	selfDeaf?: boolean;
	serverMute?: boolean;
	serverDeaf?: boolean;
	streaming?: boolean;
	selfVideo?: boolean;
	sessionId?: string;
}

async function getChannelDetails(channelId: string): Promise<{
	channel: DiscordChannel | null;
	error?: string;
}> {
	noStore();
	try {
		console.log("Fetching channel details from SurrealDB:", channelId);

		// Get guild_id from environment or use default
		const guildId = process.env.GUILD_ID || "1254694808228986912";

		// Create channel mapping from Discord channel IDs to names
		const channelMapping: Record<string, { name: string; position: number }> = {
			"1427152903260344350": { name: "Cantina", position: 1 },
			"1428282734173880440": { name: "New Channel", position: 2 },
			"1423746690342588516": { name: "afk", position: 3 },
			"1287323426465513512": { name: "Dojo", position: 0 },
		};

		const channelInfo = channelMapping[channelId];
		if (!channelInfo) {
			return {
				channel: null,
				error: "Channel not found",
			};
		}

		// Get current voice states to calculate real-time member counts
		const client = new SurrealWebSocketClient();
		await client.connect();

		const voiceStates = await client.query(
			`SELECT channel_id, user_id FROM voice_states WHERE guild_id = $guildId AND channel_id IS NOT NONE`,
			{ guildId },
		);

		await client.close();

		// Extract the actual data from the nested array structure
		const actualVoiceStates = Array.isArray(voiceStates) && voiceStates.length > 0 && Array.isArray(voiceStates[0])
			? voiceStates[0]
			: voiceStates;

		// Count members for this specific channel
		const memberCount = Array.isArray(actualVoiceStates) 
			? actualVoiceStates.filter((vs: { channel_id: string }) => vs.channel_id === channelId).length
			: 0;

		// Map to DiscordChannel interface format
		const channel: DiscordChannel = {
			id: channelId,
			name: channelInfo.name,
			status: "Active",
			type: 2, // Voice channel type
			position: channelInfo.position,
			userLimit: 0, // Default unlimited
			bitrate: 64000, // Default bitrate
			parentId: null, // Default no parent
			permissionOverwrites: [], // Default empty
			memberCount: memberCount, // Real-time count from voice states
		};

		return {
			channel,
		};
	} catch (error) {
		console.error("Error fetching channel details:", error);
		return {
			channel: null,
			error: `Failed to fetch channel details: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

async function getChannelMembers(channelId: string): Promise<{
	members: ChannelMember[];
	totalMembers: number;
	error?: string;
}> {
	noStore();
	try {
		console.log("Fetching members for channel:", channelId);

		const guildId = process.env.GUILD_ID || "1254694808228986912";
		const client = new SurrealWebSocketClient();
		await client.connect();

		// Get active voice states for this channel
		const voiceStates = await client.query(
			`SELECT * FROM voice_states WHERE channel_id = $channelId AND guild_id = $guildId`,
			{ channelId, guildId }
		);

		await client.close();

		// Extract the actual data from the nested array structure
		const actualVoiceStates = Array.isArray(voiceStates) && voiceStates.length > 0 && Array.isArray(voiceStates[0])
			? voiceStates[0]
			: voiceStates;

		// Map voice states to member data
		const members: ChannelMember[] = Array.isArray(actualVoiceStates) ? actualVoiceStates.map((vs: { user_id: string; joined_at?: string; created_at?: string; self_mute?: boolean; self_deaf?: boolean; server_mute?: boolean; server_deaf?: boolean; streaming?: boolean; self_video?: boolean; session_id?: string }) => ({
			id: vs.user_id,
			username: `user_${vs.user_id.slice(-4)}`, // Fallback username
			displayName: `User ${vs.user_id.slice(-4)}`, // Fallback display name
			avatar: null,
			discriminator: "0000",
			joinedAt: vs.joined_at || vs.created_at,
			durationMs: vs.joined_at ? Date.now() - new Date(vs.joined_at).getTime() : 0,
			selfMute: vs.self_mute || false,
			selfDeaf: vs.self_deaf || false,
			serverMute: vs.server_mute || false,
			serverDeaf: vs.server_deaf || false,
			streaming: vs.streaming || false,
			selfVideo: vs.self_video || false,
			sessionId: vs.session_id,
		})) : [];

		// Sort by longest in channel
		members.sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0));

		console.log("Found active members:", members.length);

		return {
			members,
			totalMembers: members.length,
		};
	} catch (error) {
		console.error("Error fetching channel members:", error);
		return {
			members: [],
			totalMembers: 0,
			error: `Failed to fetch channel members: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

export default async function ChannelPage({
	params,
}: {
	params: Promise<{ channelId: string }>;
}) {
	const { channelId } = await params;
	const { channel, error: channelError } = await getChannelDetails(channelId);
	const { members, error: membersError } = await getChannelMembers(channelId);

	if (channelError || !channel) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							Channel Not Found
						</h1>
						<p className="text-muted-foreground">
							The requested channel could not be found.
						</p>
						{channelError && (
							<p className="text-sm text-red-600 mt-2">
								🔸 Error: {channelError}
							</p>
						)}
					</div>
				</div>
			</div>
		);
	}

	const maxUsers = channel.userLimit === 0 ? "∞" : channel.userLimit.toString();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
					<Volume2 className="h-8 w-8 text-muted-foreground" />
					{channel.name}
				</h1>
				<div className="flex items-center">
					<Badge variant="secondary">{maxUsers}</Badge>
				</div>
			</div>

			{channel.status && (
				<p className="text-muted-foreground">{channel.status}</p>
			)}
			{membersError && (
				<p className="text-sm text-red-600 mt-2">🔸 Error: {membersError}</p>
			)}

			<LiveChannelMembers 
				initialMembers={members} 
				channelId={channelId} 
			/>
		</div>
	);
}
