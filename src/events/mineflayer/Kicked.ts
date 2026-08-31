import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

export default class KickedEvent extends MineflayerEvent {
	constructor() {
		super({
			name: "kicked",
		});
	}

	async execute(main: Minecraft, reason: string, logged: boolean): Promise<void> {
		main.playtimeTracker?.stop();
		main.client.logger.warn(`[${main.config.connection.host}] Kicked from server: ${reason} (logged: ${logged})`);
		main.reconnect();
	}
}