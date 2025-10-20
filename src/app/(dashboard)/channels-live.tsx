"use client";

import { useEffect, useState } from "react";
import type { DiscordChannel } from "./channels-table";
import { ChannelsTable } from "./channels-table";

export function ChannelsLive({
	initialChannels,
	initialTotal,
}: {
	initialChannels: DiscordChannel[];
	initialTotal: number;
}) {
	const [channels, setChannels] = useState<DiscordChannel[]>(initialChannels);
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		console.log("🔹 Setting up fast polling for real-time updates...");
		
		const baseUrl = window.location.origin;
		let intervalId: NodeJS.Timeout;

		const fetchChannels = async () => {
			try {
				const response = await fetch(`${baseUrl}/api/channels`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				
				const result = await response.json();
				console.log("🔹 Channels updated:", result.channels.length, "channels");
				setChannels(result.channels);
				setLastUpdate(new Date());
				setIsConnected(true);
				setError(null);
			} catch (err) {
				console.error("🔸 Error fetching channels:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
				setIsConnected(false);
			}
		};

		// Initial fetch
		fetchChannels();

		// Set up fast polling (every 500ms for near real-time feel)
		intervalId = setInterval(fetchChannels, 500);

		return () => {
			console.log("🔹 Cleaning up polling");
			if (intervalId) {
				clearInterval(intervalId);
			}
			setIsConnected(false);
		};
	}, []);

	// Use real-time data if available, otherwise fall back to initial data
	const displayChannels = channels;

	return (
		<div>
			{error && (
				<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					Polling Error: {error}
					<div className="text-xs mt-1">
						Using initial data. Check browser console for details.
					</div>
				</div>
			)}
			<div className="mb-2 text-sm text-gray-600">
				Status: {error ? "🔴 Connection Failed" : isConnected ? "🟢 Fast Updates Active (500ms)" : "🟡 Connecting..."}
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
