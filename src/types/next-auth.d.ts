import NextAuth from "next-auth";

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			discordId: string;
			username: string;
			displayName: string;
			discriminator: string;
			avatar: string;
		};
	}

	interface User {
		discordId: string;
		username: string;
		displayName: string;
		discriminator: string;
		avatar: string;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		discordId: string;
		username: string;
		displayName: string;
		discriminator: string;
		avatar: string;
	}
}
