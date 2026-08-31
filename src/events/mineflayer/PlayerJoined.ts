import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings";

export default class PlayerJoinedEvent extends MineflayerEvent {
	constructor() {
		super({
			name: "playerJoined",
			once: false,
		});
	}

	async execute(_main: Minecraft, _player: any): Promise<void> {
		// Join events are tracked via chat messages in MessageStr instead of mineflayer tablist playerJoined
	}
}
