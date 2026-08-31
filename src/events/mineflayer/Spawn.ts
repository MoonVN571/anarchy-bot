import { Minecraft } from "../../structures";
import { Server } from "../../typings/types";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

export default class SpawnEvent extends MineflayerEvent {
	constructor() {
		super({
			name: "spawn",
			once: false,
		});
	}

	async execute(main: Minecraft): Promise<void> {
		main.spawnCount++;
		if (main.spawnCount === 2) {
			main.currentServer = Server.Main;
			main.clearQueueTimeout();
		}

		if (main.joined) return;

		main.client.logger.start(`Bot connected to ${main.config.connection.host} as ${main.bot.username}`);

		main.joined = true;
		main.uptime = Date.now();
		main.resolveChannel();
		main.playtimeTracker?.start();

		main.startAutoMessageTimer();
		main.startTopicTimer();
	}
}