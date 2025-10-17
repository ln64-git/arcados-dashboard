import { type NextRequest, NextResponse } from "next/server";
import { executeQuery, executeQueryOne } from "@/lib/surreal/client";
import type { Channel } from "@/lib/surreal/types";

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

		// Get guild_id from environment or use default
		const guildId = process.env.GUILD_ID || "default-guild";

		// Find the channel in SurrealDB
		const channel = await executeQueryOne<Channel>(
			`SELECT * FROM channels WHERE discord_id = $discord_id AND guild_id = $guild_id`,
			{ discord_id: channelId, guild_id: guildId },
		);

		if (!channel) {
			return NextResponse.json({ error: "Channel not found" }, { status: 404 });
		}

		// Perform the test action
		switch (action) {
			case "update_member_count": {
				const newMemberCount = Math.floor(Math.random() * 50) + 1;
				await executeQuery(
					`UPDATE channels SET member_count = $member_count, updated_at = $updated_at WHERE discord_id = $discord_id AND guild_id = $guild_id`,
					{
						member_count: newMemberCount,
						updated_at: new Date().toISOString(),
						discord_id: channelId,
						guild_id: guildId,
					},
				);

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
				await executeQuery(
					`UPDATE channels SET status = $status, updated_at = $updated_at WHERE discord_id = $discord_id AND guild_id = $guild_id`,
					{
						status: newStatus,
						updated_at: new Date().toISOString(),
						discord_id: channelId,
						guild_id: guildId,
					},
				);

				return NextResponse.json({
					success: true,
					message: `Updated status to ${newStatus}`,
					channelId,
					newStatus,
				});
			}

			case "toggle_active": {
				const newActiveState = !channel.isActive;
				await executeQuery(
					`UPDATE channels SET is_active = $is_active, updated_at = $updated_at WHERE discord_id = $discord_id AND guild_id = $guild_id`,
					{
						is_active: newActiveState,
						updated_at: new Date().toISOString(),
						discord_id: channelId,
						guild_id: guildId,
					},
				);

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
