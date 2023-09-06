import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { Discord, Express, Minecraft } from "./structures";
import { ServerIp } from "./types";

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
	partials: [Partials.Message, Partials.Message, Partials.GuildMember, Partials.User],
});

new Express();

client.on("ready", () => {
	// new Minecraft(client, {
	// 	ip: ServerIp.twoYtwoC,
	// 	version: '1.20.1',
	// 	livechat: client.dev ? "987204059838709780" : "986599157068361734",
	// });

	new Minecraft(client, {
		ip: ServerIp.anarchyVN,
		auth: "offline",
		version: "1.19.4",
		livechat: client.dev ? "987204059838709780" : "1001826269664661616",
	});

	new Minecraft(client, {
		ip: ServerIp.viAnarchy,
		version: "1.20.1",
		auth: "microsoft",
		livechat: client.dev ? "987204059838709780" : "1146392891552432158",
	});
});

client.start();