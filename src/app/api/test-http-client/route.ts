import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/surreal/client";

export async function GET() {
	try {
		console.log("🔹 Testing HTTP client query...");

		// Test the HTTP client directly
		const result = await executeQuery("SELECT * FROM voice_states");
		console.log("🔹 HTTP client result:", result);

		return NextResponse.json({
			success: true,
			message: "HTTP client test completed",
			result: result,
		});
	} catch (error) {
		console.error("🔸 HTTP client test failed:", error);

		return NextResponse.json(
			{
				success: false,
				error: error.message,
				fullError: error.toString(),
			},
			{ status: 500 },
		);
	}
}
