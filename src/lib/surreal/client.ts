import "server-only";
import { validateSurrealConfig } from "./config";
import { SurrealHttpClientServer } from "./SurrealHttpClientServer";
import { SurrealWebSocketClient } from "./SurrealWebSocketClient";
import type { LiveQueryEvent } from "./types";

let surreal: SurrealHttpClientServer | null = null;
let wsClient: SurrealWebSocketClient | null = null;
let isConnecting = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000; // 1 second

export async function getSurrealConnection(): Promise<SurrealHttpClientServer> {
	if (surreal) {
		return surreal;
	}

	if (isConnecting) {
		// Wait for existing connection attempt
		await new Promise((resolve) => setTimeout(resolve, 100));
		return getSurrealConnection();
	}

	validateSurrealConfig();

	isConnecting = true;

	try {
		surreal = new SurrealHttpClientServer();

		// Connect with timeout
		await Promise.race([
			surreal.connect(),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Connection timeout")), 10000),
			),
		]);

		connectionRetries = 0; // Reset retry counter on successful connection
		console.log("🔹 Connected to SurrealDB successfully");
		return surreal;
	} catch (error) {
		connectionRetries++;
		console.error(
			`🔸 SurrealDB connection failed (attempt ${connectionRetries}/${MAX_RETRIES}):`,
			error,
		);

		if (connectionRetries < MAX_RETRIES) {
			// Exponential backoff retry
			const delay = RETRY_DELAY * 2 ** (connectionRetries - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
			isConnecting = false;
			return getSurrealConnection();
		}

		throw new Error(
			`🔸 Failed to connect to SurrealDB after ${MAX_RETRIES} attempts: ${error}`,
		);
	} finally {
		isConnecting = false;
	}
}

export async function getWebSocketConnection(): Promise<SurrealWebSocketClient> {
	if (wsClient) {
		return wsClient;
	}

	validateSurrealConfig();

	try {
		wsClient = new SurrealWebSocketClient();
		await wsClient.connect();
		console.log("🔹 Connected to SurrealDB WebSocket successfully");
		return wsClient;
	} catch (error) {
		console.error("🔸 SurrealDB WebSocket connection failed:", error);
		throw error;
	}
}

export async function closeSurrealConnection(): Promise<void> {
	if (surreal) {
		try {
			await surreal.disconnect();
		} catch (error) {
			console.warn("🔸 Error closing SurrealDB HTTP connection:", error);
		}
		surreal = null;
	}
}

export async function closeWebSocketConnection(): Promise<void> {
	if (wsClient) {
		try {
			await wsClient.close();
		} catch (error) {
			console.warn("🔸 Error closing SurrealDB WebSocket connection:", error);
		}
		wsClient = null;
	}
}

export async function closeAllConnections(): Promise<void> {
	await Promise.all([closeSurrealConnection(), closeWebSocketConnection()]);
}

// Helper function to execute queries with automatic connection management
export async function executeQuery<T = unknown>(
	query: string,
	params: Record<string, unknown> = {},
): Promise<T[]> {
	const db = await getSurrealConnection();
	try {
		return await db.executeQuery<T>(query, params);
	} catch (error) {
		console.error("🔸 SurrealDB query error:", error);
		throw error;
	}
}

// Helper function to execute a single query and return the first row
export async function executeQueryOne<T = unknown>(
	query: string,
	params: Record<string, unknown> = {},
): Promise<T | null> {
	const rows = await executeQuery<T>(query, params);
	return rows[0] || null;
}

// Helper function to execute a transaction
export async function executeTransaction<T>(
	callback: (surreal: SurrealHttpClientServer) => Promise<T>,
): Promise<T> {
	const surreal = await getSurrealConnection();
	try {
		// SurrealDB doesn't use traditional SQL transactions
		// It uses optimistic concurrency control instead
		const result = await callback(surreal);
		return result;
	} catch (error) {
		// SurrealDB handles rollback automatically on errors
		throw error;
	}
}

// Helper function to create a record ID
export function createRecordId(table: string, id: string): string {
	return `${table}:${id}`;
}

// Helper function to parse a record ID
export function parseRecordId(recordId: string): { table: string; id: string } {
	const [table, ...idParts] = recordId.split(":");
	return { table, id: idParts.join(":") };
}

// Live Query Functions (WebSocket-based)
export async function subscribeLiveQuery(
	query: string,
	params: Record<string, unknown> = {},
	callback: (event: LiveQueryEvent) => void,
): Promise<string> {
	const ws = await getWebSocketConnection();
	const liveQueryId = await ws.live(query, params);
	ws.onLiveQuery(liveQueryId, callback);
	return liveQueryId;
}

export async function unsubscribeLiveQuery(liveQueryId: string): Promise<void> {
	if (wsClient) {
		await wsClient.kill(liveQueryId);
		wsClient.offLiveQuery(liveQueryId);
		console.log("🔹 Unsubscribed from live query:", liveQueryId);
	}
}

// Convenience functions for common subscriptions
export async function subscribeToChannels(
	guildId: string,
	callback: (event: LiveQueryEvent) => void,
): Promise<string> {
	return subscribeLiveQuery(
		`SELECT * FROM channels WHERE guildId = $guildId`,
		{ guildId },
		callback,
	);
}

export async function subscribeToVoiceSessions(
	channelId?: string,
	callback?: (event: LiveQueryEvent) => void,
): Promise<string> {
	const query = channelId
		? `SELECT * FROM voice_sessions WHERE channelId = $channelId AND isActive = true`
		: `SELECT * FROM voice_sessions WHERE isActive = true`;
	const params = channelId ? { channelId } : {};

	return subscribeLiveQuery(query, params, callback || (() => {}));
}

export async function subscribeToMembers(
	guildId: string,
	callback: (event: LiveQueryEvent) => void,
): Promise<string> {
	return subscribeLiveQuery(
		`SELECT * FROM users WHERE guildId = $guildId`,
		{ guildId },
		callback,
	);
}

export async function subscribeToMessages(
	channelId: string,
	callback: (event: LiveQueryEvent) => void,
	limit: number = 50,
): Promise<string> {
	return subscribeLiveQuery(
		`SELECT * FROM messages WHERE channelId = $channelId ORDER BY timestamp DESC LIMIT $limit`,
		{ channelId, limit },
		callback,
	);
}
