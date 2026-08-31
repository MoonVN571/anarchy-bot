import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings";

export default class ErrorEvent extends MineflayerEvent {
	constructor() {
		super({
			name: "error",
		});
	}

	async execute(main: Minecraft, error: Error | any): Promise<void> {
		const errorMessage = error?.message || error?.code || String(error);
		main.client.logger.error(`[${main.config.connection.host}] Mineflayer bot error: ${errorMessage}`);
		main.playtimeTracker?.stop();
		main.reconnect();
	}
}
