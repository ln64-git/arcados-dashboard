import { NextResponse } from "next/server";
import { SurrealHttpClientServer } from "@/lib/surreal/SurrealHttpClientServer";

export async function GET() {
	try {
		console.log("🔹 Testing server-side SurrealDB connection...");

		const client = new SurrealHttpClientServer();

		// Test connection
		await client.connect();

		// Test a simple query
		const result = await client.executeQuery("SELECT * FROM users LIMIT 1");

		await client.disconnect();

		return NextResponse.json({
			status: "success",
			message: "Server-side SurrealDB connection test successful",
			result: result,
		});
	} catch (error) {
		console.error("🔸 Server-side SurrealDB test failed:", error);

		return NextResponse.json(
			{
				status: "error",
				message: "Server-side SurrealDB connection test failed",
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			{ status: 500 },
		);
	}
}
