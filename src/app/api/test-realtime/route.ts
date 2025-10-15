import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { channels, db } from "@/lib/db";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { channelId, action } = body;

		if (!channelId || !action) {
			return NextResponse.json(
				{ error: "Missing channelId or action" },
				{ status: 400 },
			);
		}

		console.log(
			`🔹 Testing realtime update: ${action} for channel ${channelId}`,
		);

		// Find the channel
		const channel = await db
			.select()
			.from(channels)
			.where(eq(channels.discordId, channelId))
			.limit(1);

		if (channel.length === 0) {
			return NextResponse.json({ error: "Channel not found" }, { status: 404 });
		}

		const channelData = channel[0];

		// Perform the test action
		switch (action) {
			case "update_member_count": {
				const newMemberCount = Math.floor(Math.random() * 50) + 1;
				await db
					.update(channels)
					.set({
						memberCount: newMemberCount,
						updatedAt: new Date(),
					})
					.where(eq(channels.discordId, channelId));

				return NextResponse.json({
					success: true,
					message: `Updated member count to ${newMemberCount}`,
					channelId,
					newMemberCount,
				});
			}

			case "update_status": {
				const statuses = ["active", "inactive", "maintenance"];
				const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
				await db
					.update(channels)
					.set({
						status: newStatus,
						updatedAt: new Date(),
					})
					.where(eq(channels.discordId, channelId));

				return NextResponse.json({
					success: true,
					message: `Updated status to ${newStatus}`,
					channelId,
					newStatus,
				});
			}

			case "toggle_active": {
				const newActiveState = !channelData.isActive;
				await db
					.update(channels)
					.set({
						isActive: newActiveState,
						updatedAt: new Date(),
					})
					.where(eq(channels.discordId, channelId));

				return NextResponse.json({
					success: true,
					message: `Toggled active state to ${newActiveState}`,
					channelId,
					newActiveState,
				});
			}

			default:
				return NextResponse.json(
					{
						error:
							"Invalid action. Use: update_member_count, update_status, or toggle_active",
					},
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("🔸 Error in test endpoint:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
