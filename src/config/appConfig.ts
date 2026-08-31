import {
	MinecraftServerConfig,
	RateLimitConfig,
	LiveChatTopicConfig,
	AutoMessageConfig,
	AuthType,
} from "../typings/config.types";
import { ServerIp } from "../typings/types";

export const defaultRateLimitConfig: RateLimitConfig = {
	enabled: true,
	time: 2 * 60 * 1000,
	windowSize: 10 * 1000,
	messageThreshold: 10,
	burstThreshold: 5,
	burstInterval: 2 * 1000,
	minimumEmbeds: 5,
};

export const defaultTopicConfig: LiveChatTopicConfig = {
	enabled: true,
	interval: 5 * 1000 + 10 * 60 * 1000,
};

export const defaultAutoMessageConfig: AutoMessageConfig = {
	enabled: false,
	interval: 15 * 60 * 1000,
	messages: [],
};

export interface CreateServerConfigOptions {
	id?: string;
	name?: string;
	ip: ServerIp | string;
	port?: number;
	version?: string;
	auth?: AuthType;
	channelId: string;
	reconnectInterval?: number;
	autoNavigateCommand?: string;
}

export function createServerConfig(options: CreateServerConfigOptions): MinecraftServerConfig {
	const authMode: AuthType = (options.auth || (process.env.AUTH_MODE as AuthType) || "offline");

	return {
		id: options.id || options.ip,
		name: options.name || options.ip,
		connection: {
			host: options.ip,
			port: options.port || 25565,
			version: options.version || "1.19.4",
			auth: authMode,
			username: authMode === "offline" ? (process.env.BOT_NAME || "mo0nbot") : undefined,
			microsoftEmail: process.env.MICROSOFT_EMAIL,
			microsoftPassword: process.env.MICROSOFT_PASSWORD,
			profilesFolder: "./.ms_cache",
		},
		auth: {
			authmePassword: process.env.AUTHME,
			pin: process.env.PIN ? process.env.PIN.split("") : undefined,
			autoNavigateCommand: options.autoNavigateCommand,
		},
		livechat: {
			channelId: options.channelId,
			chatTemplate: "> [{displayName}] {message} | bit.ly/mo0nbot",
			rateLimit: { ...defaultRateLimitConfig },
			topic: { ...defaultTopicConfig },
			autoMessage: { ...defaultAutoMessageConfig },
		},
		reconnectInterval:
			options.reconnectInterval ??
			(process.env.RECONNECT_INTERVAL_MS ? parseInt(process.env.RECONNECT_INTERVAL_MS, 10) : 10 * 1000),
	};
}
