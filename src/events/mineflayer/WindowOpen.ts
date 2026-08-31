import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings";

interface MinecraftWindow {
	requiresConfirmation?: boolean;
	slots: unknown[];
	type?: string;
	title?: string;
}

export default class WindowOpenEvent extends MineflayerEvent {
	constructor() {
		super({
			name: 'windowOpen',
		});
	}

	async execute(main: Minecraft, window: MinecraftWindow): Promise<void> {
		window.requiresConfirmation = false;

		main.client.logger.info(`Slot: ${window.slots.length}`);

		switch (window.slots.length) {
			case 63:
				main.bot?.clickWindow(13, 0, 0);
				break;
		}
	}
}