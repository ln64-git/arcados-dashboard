import { unstable_noStore as noStore } from "next/cache";
import { getAllChannels } from "@/lib/db";
import { ChannelsLive } from "./channels-live";
import type { DiscordChannel } from "./channels-table";
import { SSERefresherChannels } from "./sse-refresher-channels";

export const dynamic = "force-dynamic";

async function getChannels(): Promise<{
	channels: DiscordChannel[];
	totalChannels: number;
	error?: string;
}> {
	try {
		noStore();
		console.log("Fetching channels from database...");

		// Fetch channels directly from database instead of making HTTP request
		const dbChannels = await getAllChannels();
		console.log("Fetched channels count:", dbChannels.length);

		// Map database fields to DiscordChannel interface format
		const formattedChannels = dbChannels.map((channel) => ({
			id: channel.discordId,
			name: channel.channelName,
			status: channel.status ?? null,
			type: 2, // Voice channel type
			position: channel.position, // Use actual position from DB
			userLimit: 0, // Default unlimited since not in DB
			bitrate: 64000, // Default bitrate since not in DB
			parentId: null, // Default no parent since not in DB
			permissionOverwrites: [], // Default empty since not in DB
			memberCount: channel.memberCount || 0, // Use actual member count from DB
		}));

		console.log("Formatted channels count:", formattedChannels.length);

		return {
			channels: formattedChannels,
			totalChannels: formattedChannels.length,
		};
	} catch (error) {
		console.error("Error fetching channels from database:", error);
		return {
			channels: [],
			totalChannels: 0,
			error: `Failed to fetch channels: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

export default async function ChannelsPage() {
	const { channels, totalChannels, error } = await getChannels();

	return (
		<div className="space-y-4">
			<SSERefresherChannels />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Channels</h1>
					<p className="text-muted-foreground">
						View and manage Discord voice channels in your server.
					</p>
					{error && (
						<p className="text-sm text-red-600 mt-2">🔸 Error: {error}</p>
					)}
					{!error && channels.length === 0 && (
						<p className="text-sm text-amber-600 mt-2">
							⚠️ No voice channels found in your Discord server
						</p>
					)}
					{!error && channels.length > 0 && (
						<p className="text-sm text-green-600 mt-2">
							🔹 Found {totalChannels} voice channel
							{totalChannels !== 1 ? "s" : ""} from Discord
						</p>
					)}
				</div>
			</div>
			<ChannelsLive initialChannels={channels} initialTotal={totalChannels} />
		</div>
	);
}
