import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, getChannelByDiscordId, users } from "@/lib/db";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ channelId: string }> },
) {
	try {
		const { channelId } = await params;
		console.log("Fetching members for channel:", channelId);

		// Get channel from database
		const channel = await getChannelByDiscordId(channelId);

		if (!channel) {
			return NextResponse.json(
				{
					members: [],
					totalMembers: 0,
					error: "Channel not found",
				},
				{ status: 200 },
			);
		}

		// If no active users, return empty
		if (!channel.activeUserIds || channel.activeUserIds.length === 0) {
			return NextResponse.json({
				members: [],
				totalMembers: 0,
			});
		}

		// Get user details for active users
		const activeMembers = await db
			.select({
				id: users.discordId,
				username: users.username,
				displayName: users.displayName,
				nickname: users.nickname,
				avatar: users.avatar,
				discriminator: users.discriminator,
			})
			.from(users)
			.where(inArray(users.discordId, channel.activeUserIds));

		console.log("Found active members:", activeMembers.length);

		// Map the results to use nickname if available, otherwise fall back to displayName
		const membersWithNicknames = activeMembers.map((member) => ({
			...member,
			displayName: member.nickname || member.displayName, // Use nickname if available, otherwise displayName
		}));

		return NextResponse.json({
			members: membersWithNicknames,
			totalMembers: membersWithNicknames.length,
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
