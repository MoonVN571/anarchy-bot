import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../types";

export const data = {
	name: MineflayerEvent.Kicked,
};

export async function execute(main: Minecraft, reason: string, logged: boolean) {
	console.log(main.config.serverInfo.ip, reason, logged);
}