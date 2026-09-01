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
		main.client.logger.debug("Mineflayer", `Bot spawn event #${main.spawnCount} triggered at ${main.bot?.entity?.position}`);

		if (main.currentServer !== Server.Main) {
			const lobbyNpc = main.config.auth.lobbyNpc;
			if (lobbyNpc?.enabled) {
				setTimeout(() => {
					if (main.currentServer !== Server.Main && main.bot?.entity) {
						main.smartPathfinderService?.navigateToLobbyNpc(lobbyNpc.x, lobbyNpc.y, lobbyNpc.z);
					}
				}, 1200);
			}
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

		// Only start Anti-AFK, AutoEat, and survival movements if already on Main server
		if (main.currentServer === Server.Main) {
			main.antiAfkService?.start();
			main.autoEatService?.start();
			main.smartPathfinderService?.initMovements();
		}
	}
}