import { Application } from "express";
import { Discord } from "../../structures";
import { statusRoutes } from "./status.routes";
import { discordRoutes } from "./discord.routes";

export function setupRoutes(app: Application, discordClient: Discord) {
  // Root endpoint
  app.all("/", (req, res) => {
    res.status(200).json({
      status: "success",
      message: "API is running",
      version: "1.0.0"
    });
  });

  // API routes
  app.use('/api/status', statusRoutes);
  app.use('/api/discord', discordRoutes(discordClient));
}
