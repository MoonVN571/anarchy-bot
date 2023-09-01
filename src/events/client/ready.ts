import { Discord } from "../../structures";

export async function execute(client: Discord) {
	client.logger.start("Logged in as " + client.user.tag);
}