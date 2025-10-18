"use client";

import { usePolling } from "@/hooks/usePolling";
import type { DiscordChannel } from "./channels-table";
import { ChannelsTable } from "./channels-table";

export function ChannelsLive({
	initialChannels,
	initialTotal,
}: {
	initialChannels: DiscordChannel[];
	initialTotal: number;
}) {
	const { data: channels, loading: isLoading, error, lastUpdate } = usePolling({
		queryFn: async () => {
			const response = await fetch("/api/channels");
			const result = await response.json();
			return result.channels || [];
		},
		interval: 3000, // Poll every 3 seconds
		onError: (error) => {
			console.error("🔸 Channels polling error:", error);
		},
		onSuccess: (data) => {
			console.log("🔹 Channels updated via polling:", data.length, "channels");
		},
	});

	// Use polling data if available, otherwise fall back to initial data
	const displayChannels = channels || initialChannels;

	return (
		<div>
			{error && (
				<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					Polling Error: {error}
				</div>
			)}
			{isLoading && (
				<div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
					Loading channel updates...
				</div>
			)}
			<div className="mb-2 text-sm text-gray-600">
				Status: 🟢 Polling Active
				{lastUpdate && (
					<span className="ml-2">
						Last update: {lastUpdate.toLocaleTimeString()}
					</span>
				)}
			</div>
			<ChannelsTable
				channels={displayChannels as DiscordChannel[]}
				offset={0}
				totalChannels={initialTotal}
			/>
		</div>
	);
}
