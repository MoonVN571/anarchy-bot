import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

export default class EndEvent extends MineflayerEvent {
	constructor() {
		super({
			name: "end",
		});
	}

	async execute(main: Minecraft, reason: string): Promise<void> {
		main.client.logger.info(`[${main.config.connection.host}] Connection ended: ${reason}`);
		main.reconnect();
	}
}