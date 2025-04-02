import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

export default class EndEvent extends MineflayerEvent {
	constructor() {
		super({
			name: 'end',
		});
	}

	async execute(main: Minecraft, reason: string): Promise<void> {
		main.client.logger.info(main.config.serverInfo.ip, reason);

		setTimeout(() => {
			new Minecraft(main.client, main.config.serverInfo);
		}, main.config.reconnectInterval);
	}
}