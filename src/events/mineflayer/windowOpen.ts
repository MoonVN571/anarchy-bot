import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../types";

export const data = {
	name: MineflayerEvent.WindowOpen,
};

export async function execute(main: Minecraft, window) {
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
	}
}