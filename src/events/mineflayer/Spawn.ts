import { Minecraft } from "../../structures";
import { Server } from "../../typings";
import { MineflayerEvent } from "../../typings";

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
			main.antiAfkService?.start();
			main.autoEatService?.start();
		}

		if (main.joined) return;

		main.client.logger.start(`Bot connected to ${main.config.connection.host} as ${main.bot.username}`);

		main.joined = true;
		main.uptime = Date.now();
		main.resolveChannel();
		main.playtimeTracker?.start();

		main.startAutoMessageTimer();
		main.startTopicTimer();
		main.startViewer();
		main.antiAfkService?.start();
		main.autoEatService?.start();
		main.smartPathfinderService?.initMovements();
	}
}