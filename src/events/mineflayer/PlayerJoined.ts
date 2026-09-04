import { MailService } from "../../services";
import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings";

export default class PlayerJoinedEvent extends MineflayerEvent {
	constructor() {
		super({
			name: "playerJoined",
			once: false,
		});
	}

	async execute(main: Minecraft, player: any): Promise<void> {
		if (player && player.username) {
			const username = player.username;
			const botName = main.bot?.username;
			if (botName && username.toLowerCase() === botName.toLowerCase()) return;

			MailService.deliverMailsToPlayer(main, username).catch(() => {});
			MailService.checkDeliveryReceiptsForSender(main, username).catch(() => {});
		}
	}
}

