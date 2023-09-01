import { Minecraft } from "../../structures";

export async function execute(main: Minecraft, reason: string) {
	console.log(reason);

	setTimeout(() => {
		new Minecraft(main.client, main.config.serverInfo);
	}, main.config.reconnectInterval);
}