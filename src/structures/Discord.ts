import { config } from "dotenv";
import { Client } from "discord.js";
import { readdirSync } from "fs";
import { Logger } from "./";
import { DefaultOptions } from "../types";
config();

export class Discord extends Client {
	public logger: Logger = new Logger();

	public dev = process.env.NODE_ENV == "development";
	public config: DefaultOptions = {
		prefix: "!",
		developers: [
			"497768011118280716"
		],
		dev: this.dev,
		guildId: "794912016237985802",
		emojis: { tick: "<:tickYes:885806587351015454>" },
	};

	public async start(): Promise<string> {
		this.loadEvents();

		this.rest.on("rateLimited", (info) => {
			this.logger.warn(info);
		});

		process.on("uncaughtException", (error) => {
			this.logger.error(error);
		});

		return await this.login(process.env.TOKEN);
	}

	public loadEvents(): void {
		readdirSync((this.dev ? "./src" : "./dist") + "/events/client").forEach(async event => {
			const eventName = event.split(".")[0];
			const data = await import(`../events/client/${eventName}`);
			this.on(eventName, (...p) => data.execute(this, ...p));
		});
	}
}
