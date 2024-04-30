import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../types";

export const data = {
	name: MineflayerEvent.End,
};

export async function execute(main: Minecraft, reason: string) {
	console.log(main.config.serverInfo.ip, reason);

	setTimeout(() => {
		new Minecraft(main.client, main.config.serverInfo);
	}, main.config.reconnectInterval);
}