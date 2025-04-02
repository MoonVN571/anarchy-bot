import { Discord } from "../../structures";

export class DiscordService {
	private discordClient: Discord;

	constructor(discordClient: Discord) {
		this.discordClient = discordClient;
	}

	async getGuilds() {
		return this.discordClient.getGuilds();
	}
}
