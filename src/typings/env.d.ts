declare namespace NodeJS {
	interface ProcessEnv {
		TOKEN: string;
		NODE_ENV?: "development" | "production";
		DEBUG?: string;

		// Web Server & API
		ENABLE_BACKEND?: string;
		PORT?: string;
		API_KEY?: string;

		// Database & Cache
		MONGODB_URI?: string;
		REDIS_URL?: string;
		REDIS_PREFIX?: string;

		// Discord Channels
		DEATH_VERIFY_CHANNEL_ID?: string;

		// Minecraft Bot Auth
		AUTH_MODE?: "microsoft" | "offline";
		BOT_NAME?: string;
		AUTHME?: string;
		PIN?: string;

		// Microsoft Authentication
		MICROSOFT_EMAIL?: string;
		MICROSOFT_PASSWORD?: string;
	}
}