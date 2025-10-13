import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DiscordChannel } from './channels-table';
import { ChannelsTable } from './channels-table';

async function getChannels(): Promise<{
	channels: DiscordChannel[];
	totalChannels: number;
	error?: string;
}> {
	try {
		const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
		console.log('Fetching channels from:', `${baseUrl}/api/channels`);
		
		const response = await fetch(`${baseUrl}/api/channels`, {
			cache: 'no-store',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		
		console.log('API Response status:', response.status);
		
		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}
		
		const data = await response.json();
		console.log('API Response data:', data);
		
		return {
			channels: data.channels || [],
			totalChannels: data.totalChannels || 0,
			error: data.error,
		};
	} catch (error) {
		console.error('Error fetching channels:', error);
		return {
			channels: [],
			totalChannels: 0,
			error: `Failed to fetch channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

export default async function ChannelsPage(props: {
	searchParams: Promise<{ q: string; offset: string }>;
}) {
	const searchParams = await props.searchParams;
	const offset = searchParams.offset ?? 0;
	const { channels, totalChannels, error } = await getChannels();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Channels</h1>
					<p className="text-muted-foreground">
						View and manage Discord voice channels in your server.
					</p>
					{error && (
						<p className="text-sm text-red-600 mt-2">
							🔸 Error: {error}
						</p>
					)}
					{!error && channels.length === 0 && (
						<p className="text-sm text-amber-600 mt-2">
							⚠️ No voice channels found in your Discord server
						</p>
					)}
					{!error && channels.length > 0 && (
						<p className="text-sm text-green-600 mt-2">
							🔹 Found {totalChannels} voice channel{totalChannels !== 1 ? 's' : ''} from Discord
						</p>
					)}
				</div>
				<Button className="gap-2">
					<PlusCircle className="h-4 w-4" />
					Add Channel
				</Button>
			</div>
			<ChannelsTable
				channels={channels}
				offset={Number(offset)}
				totalChannels={totalChannels}
			/>
		</div>
	);
}
