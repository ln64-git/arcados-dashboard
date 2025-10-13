import { NextResponse } from "next/server";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ channelId: string }> },
) {
	try {
		const { channelId } = await params;
		const botToken = process.env.DISCORD_BOT_TOKEN;
		const serverId = process.env.DISCORD_SERVER_ID;

		console.log("Fetching members for channel:", channelId);

		// Check if Discord credentials are configured
		if (!botToken || !serverId) {
			console.error("Missing Discord environment variables");
			return NextResponse.json(
				{
					members: [],
					error:
						"Discord credentials not configured. Please set DISCORD_BOT_TOKEN and DISCORD_SERVER_ID environment variables.",
				},
				{ status: 200 },
			);
		}

		// Note: Discord REST API doesn't provide real-time voice state information
		// Voice states are only available through Discord.js or Gateway API
		// For now, we'll return mock data to demonstrate the UI

		console.log(
			"Voice states not available via REST API - returning mock data for demonstration",
		);

		// Mock data for demonstration purposes
		const mockMembers = [
			{
				id: "123456789012345678",
				username: "john_doe",
				displayName: "John Doe",
				avatar: "a_1234567890abcdef",
				discriminator: "1234",
			},
			{
				id: "987654321098765432",
				username: "jane_smith",
				displayName: "Jane Smith",
				avatar: null,
				discriminator: "5678",
			},
		];

		return NextResponse.json({
			members: mockMembers,
			totalMembers: mockMembers.length,
			error:
				"Note: This is mock data. Real-time voice state information requires Discord.js or Gateway API integration.",
		});
	} catch (error) {
		console.error("Error fetching channel members:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch channel members",
				members: [],
				totalMembers: 0,
			},
			{ status: 200 }, // Return 200 instead of 500 to prevent loading issues
		);
	}
}
