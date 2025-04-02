import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

export default class WindowOpenEvent extends MineflayerEvent {
	constructor() {
		super({
			name: 'windowOpen',
		});
	}
	async execute(main: Minecraft, window: any): Promise<void> {
		window.requiresConfirmation = false;

		main.client.logger.info(`Slot: ${window.slots.length}`);

		switch (window.slots.length) {
			case 46: {
				const pin = main.config.pin.map(pin => +pin);

				for (let i = 0; i < 4; i++)
					main.bot.clickWindow(pin[i], 0, 0);

				break;
			}
			case 63:
				main.bot.clickWindow(13, 0, 0);
				break;
			case 90:
				main.bot.clickWindow(31, 0, 0);
				break;
			case 81:
				main.bot.clickWindow(13, 0, 0);
				break;
		}
	}
}