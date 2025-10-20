import { NextRequest, NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function GET() {
	try {
		console.log("🔹 Testing SurrealDB connection...");
		
		const client = new SurrealWebSocketClient();
		console.log("🔹 Client created successfully");
		
		await client.connect();
		console.log("🔹 Connected successfully!");
		
		// Test a simple query
		const result = await client.query('INFO FOR DB');
		console.log("🔹 Database info:", result);
		
		await client.close();
		console.log("🔹 Connection closed");
		
		return NextResponse.json({
			success: true,
			message: "Connected to SurrealDB successfully",
			databaseInfo: result
		});
		
	} catch (error) {
		console.error("🔸 Connection failed:", error);
		
		return NextResponse.json({
			success: false,
			error: error.message,
			fullError: error.toString()
		}, { status: 500 });
	}
}

