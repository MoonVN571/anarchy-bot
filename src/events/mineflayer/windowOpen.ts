import { Minecraft } from "../../structures";

export async function execute(main: Minecraft, window) {
	window.requiresConfirmation = false;

	switch (window.slots.length) {
	case 46: {
		const pin = main.config.pin.map(pin => +pin);
        
		for (let i = 0; i < 4; i++)
			main.bot.clickWindow(pin[i], 0, 0);

		break;
	}
	case 63:
		main.bot.clickWindow(13, 0, 0);
	}
}