import { Request, Response } from "express";
import { Discord } from "../../structures";

export class DiscordController {
	private discordClient: Discord;

	constructor(discordClient: Discord) {
		this.discordClient = discordClient;
	}

	getGuilds = async (req: Request, res: Response) => {
		try {
			const guilds = await this.discordClient.getGuilds();
			res.json({
				success: true,
				data: guilds.map(g=>({ guildId: g.id, name: g.name })),
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: `Server internal error: ${error}`
			});
		}
	}

	getGuildDetails = async (req: Request, res: Response): Promise<void> => {
		try {
			const { guildId } = req.params;
			const guild = await this.discordClient.getGuild(guildId);
			if (!guild) {
				return void res.status(404).json({
					success: false,
					error: "Guild not found"
				});
			}
			res.json({
				success: true,
				data: guild
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: `Server internal error: ${error}`
			});
		}
	}
}
