import { Minecraft } from "../../structures";

export async function execute(main: Minecraft, reason: string, logged: boolean) {
	console.log(reason, logged);
}