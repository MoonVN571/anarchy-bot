import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

export default class WindowOpenEvent extends MineflayerEvent {
	constructor() {
		super({
			name: 'windowOpen',
		});
	}

	// eslint-disable-next-line
	async execute(main: Minecraft, window: any): Promise<void> {
		window.requiresConfirmation = false;

		main.client.logger.info(`Slot: ${window.slots.length}`);

		switch (window.slots.length) {
			case 63:
				main.bot.clickWindow(13, 0, 0);
				break;
		}
	}
}