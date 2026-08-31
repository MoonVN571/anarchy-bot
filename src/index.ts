// Hook require('canvas') -> @napi-rs/canvas for libraries like prismarine-viewer
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require("module");
const originalRequire = Module.prototype.require;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Module.prototype.require = function (id: string): any {
	if (id === "canvas") {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return require("@napi-rs/canvas");
	}
	// eslint-disable-next-line prefer-rest-params
	return originalRequire.apply(this, arguments);
};

import { ActivityType, Events, GatewayIntentBits, Partials } from "discord.js";
import { Discord, MinecraftBotManager } from "./structures";
import { ServerIp } from "./typings/types";
import { createServerConfig } from "./config";
import { Express } from "./backend";
import { Database } from "./database";
import { RedisClient } from "./redis";
import dotenv from "@dotenvx/dotenvx";
dotenv.config();

const client = new Discord({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
	presence: {
		status: "online",
		activities: [{ type: ActivityType.Custom, name: "Livechat anarchy servers" }],
	},
	partials: [Partials.Message, Partials.GuildMember, Partials.User],
	allowedMentions: { repliedUser: false },
});

client.once(Events.ClientReady, async () => {
	// 1. Connect MongoDB & Redis Cache
	await Database.connect();
	await RedisClient.connect();

	// 2. Start Express Web Server (if enabled via ENABLE_BACKEND=true)
	const enableBackend = process.env.ENABLE_BACKEND === "true";
	if (enableBackend) {
		new Express(client);
	} else {
		client.logger.info("Backend service is disabled (ENABLE_BACKEND=false).");
	}

	// 3. Initialize Minecraft Bot Manager & Register Server Instances
	const botManager = new MinecraftBotManager(client);

	const anarchyVNConfig = createServerConfig({
		id: "anarchyVN",
		name: "AnarchyVN (2y2c.org)",
		ip: ServerIp.anarchyVN,
		version: "1.19.4",
		channelId: client.dev ? "987204059838709780" : "1543610895584727080",
	});

	botManager.addServer(anarchyVNConfig);
});

client.start();