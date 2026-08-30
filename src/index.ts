import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { Discord, Minecraft } from "./structures";
import { ServerIp } from "./typings/types";
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
});

client.on("ready", async () => {
	// 1. Connect MongoDB & Redis Cache
	await Database.connect();
	await RedisClient.connect();

	// 2. Start Express Web Server (nếu được bật qua ENABLE_BACKEND=true)
	const enableBackend = process.env.ENABLE_BACKEND === "true";
	if (enableBackend) {
		new Express(client);
	} else {
		client.logger.info("Backend service is disabled (ENABLE_BACKEND=false).");
	}

	// 3. Start Minecraft Bot Instance(s)
	const authMode = (process.env.AUTH_MODE as "microsoft" | "offline") || "offline";

	new Minecraft(client, {
		ip: ServerIp.anarchyVN,
		auth: authMode,
		version: "1.19.4",
		livechat: client.dev ? "987204059838709780" : "1543610895584727080",
	});
});

client.start();