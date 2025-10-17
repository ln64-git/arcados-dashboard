export const surrealConfig = {
	url: process.env.SURREAL_URL,
	namespace: process.env.SURREAL_NAMESPACE || "arcados-bot",
	database: process.env.SURREAL_DATABASE || "arcados-bot",
	username: process.env.SURREAL_USERNAME || "root",
	password: process.env.SURREAL_PASSWORD || "root",
	token: process.env.SURREAL_TOKEN,
} as const;

export function validateSurrealConfig() {
	if (!surrealConfig.url) {
		throw new Error("🔸 SURREAL_URL is required");
	}

	if (
		!surrealConfig.token &&
		(!surrealConfig.username || !surrealConfig.password)
	) {
		throw new Error(
			"🔸 Either SURREAL_TOKEN or SURREAL_USERNAME/SURREAL_PASSWORD must be provided",
		);
	}

	return surrealConfig;
}
