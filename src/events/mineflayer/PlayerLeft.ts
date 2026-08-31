import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings";

export default class PlayerLeftEvent extends MineflayerEvent {
	constructor() {
		super({
			name: "playerLeft",
			once: false,
		});
	}

	async execute(_main: Minecraft, _player: any): Promise<void> {
		// Leave events are tracked via chat messages in MessageStr instead of mineflayer tablist playerLeft
	}
}
