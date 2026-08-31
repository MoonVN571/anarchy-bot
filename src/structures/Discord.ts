import { Client } from "discord.js";

import { logger } from "./";
import { loadDiscordEvents } from "../events/discord";
import { botConfig } from "../config";

export class Discord extends Client {
	public logger = logger;

	public dev = process.env.NODE_ENV == "development";
	public config = botConfig;

	public async start(): Promise<string> {
		await loadDiscordEvents(this);

		this.rest.on("rateLimited", (info) => {
			this.logger.warn(info);
		});

		process.on("uncaughtException", (error) => {
			this.logger.error(error);
		});

		return await this.login(process.env.TOKEN);
	}

	public async getGuilds() {
		return await this.guilds.fetch();
	}

	public async getGuild(guildId: string) {
		return await this.guilds.fetch(guildId);
	}
}
