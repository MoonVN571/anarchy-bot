export type AuthType = "offline" | "microsoft";

export interface MinecraftConnectionConfig {
	host: string;
	port?: number;
	version?: string;
	auth: AuthType;
	username?: string;
	microsoftEmail?: string;
	microsoftPassword?: string;
	profilesFolder?: string;
}

export interface MinecraftAuthConfig {
	authmePassword?: string;
	pin?: string[];
	autoNavigateCommand?: string;
}

export interface RateLimitConfig {
	enabled: boolean;
	time: number; // Cooldown period when rate limited (ms)
	windowSize: number; // Sliding window size in ms
	messageThreshold: number; // Max messages in window before limiting
	burstThreshold: number; // Max messages in quick succession
	burstInterval: number; // Interval to check for bursts in ms
	minimumEmbeds: number; // Minimum embeds to send when rate limited
}

export interface LiveChatTopicConfig {
	enabled: boolean;
	interval: number; // in ms
}

export interface AutoMessageConfig {
	enabled: boolean;
	interval: number; // in ms
	messages: string[];
}

export interface LiveChatConfig {
	channelId: string;
	chatTemplate: string; // e.g. "> [{displayName}] {message} | bit.ly/mo0nbot"
	rateLimit: RateLimitConfig;
	topic: LiveChatTopicConfig;
	autoMessage: AutoMessageConfig;
}

export interface MinecraftServerConfig {
	id: string;
	name: string;
	connection: MinecraftConnectionConfig;
	auth: MinecraftAuthConfig;
	livechat: LiveChatConfig;
	reconnectInterval: number; // in ms
}

export interface BotConfig {
	emojis: {
		tick: string;
		no_chatting: string;
	};
	prefix: string;
	developers: string[];
	guildId: string;
	deathVerificationChannel: string;
	defaultReplyColor?: number;
}
