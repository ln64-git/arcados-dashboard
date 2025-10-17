"use client";

import { useChannelLiveQuery } from "@/hooks/useDirectWebSocket";
import type { DiscordChannel } from "./channels-table";
import { ChannelsTable } from "./channels-table";

export function ChannelsLive({
	initialChannels,
	initialTotal,
}: {
	initialChannels: DiscordChannel[];
	initialTotal: number;
}) {
	const { channels, total } = useChannelLiveQuery(
		initialChannels,
		initialTotal,
	);

	return (
		<ChannelsTable
			channels={channels}
			offset={Math.min(channels.length, 5)}
			totalChannels={total}
		/>
	);
}
