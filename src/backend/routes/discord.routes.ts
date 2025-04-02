
import { Router } from "express";
import { Discord } from "../../structures";
import { authMiddleware } from "../middleware";
import { DiscordController } from "../controllers/discord.controller";

export function discordRoutes(discordClient: Discord) {
	const router = Router();
	const discordController = new DiscordController(discordClient);

	// Apply auth middleware to protected routes
	router.use(authMiddleware);
  
	router.get('/guilds', discordController.getGuilds);
	router.get('/guilds/:guildId', discordController.getGuildDetails);

	return router;
}