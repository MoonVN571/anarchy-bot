import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { Discord, Minecraft } from "./structures";
import { ServerIp } from "./typings/types";
import { Express } from "./backend";
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
	partials: [Partials.Message, Partials.Message, Partials.GuildMember, Partials.User],
});


client.on("ready", () => {
	new Express(client);

	// new Minecraft(client, {
	// 	ip: ServerIp.twoYtwoC,
	// 	version: '1.20.1',
	// 	livechat: client.dev ? "987204059838709780" : "986599157068361734",
	// });

	new Minecraft(client, {
		ip: ServerIp.anarchyVN,
		auth: "offline",
		version: "1.20.4",
		livechat: client.dev ? "987204059838709780" : "1001826269664661616",
	});

	// new Minecraft(client, {
	// 	ip: ServerIp.viAnarchy,
	// 	version: "1.20.1",
	// 	auth: "offline",
	// 	livechat: client.dev ? "987204059838709780" : "1146392891552432158",
	// });


	// new Minecraft(client, {
	// 	ip: ServerIp._2A2BOrg,
	// 	version: "1.20.4",
	// 	auth: "microsoft",
	// 	livechat: client.dev ? "987204059838709780" : "1231592483780300872",
	// });

	// new Minecraft(client, {
	// 	ip: ServerIp.MCVui,
	// 	version: "1.20.4",
	// 	auth: "offline",
	// 	livechat: client.dev ? "987204059838709780" : "1234031355659157588",
	// });
});

client.start();