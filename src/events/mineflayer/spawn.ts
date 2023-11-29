import { Minecraft } from "../../structures";
import { Server, ServerIp } from "../../types";

export async function execute(main: Minecraft) {
	main.spawnCount++;
	if (main.spawnCount === 2) main.currentServer = Server.Main;

	if (main.joined) return;
	main.client.logger.start("Bot connected to " + main.config.serverInfo.ip);

	main.joined = true;
	main.uptime = Date.now();

	const { autoMessage, topic } = main.config.livechat;
	if (autoMessage.enabled) {
		let msgIndex = 0;
		const msgs = autoMessage.msgs;
		const formatDate = (date: Date) => {
			const day = String(date.getDate()).padStart(2, "0");
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const year = date.getFullYear();
			const hours = String(date.getHours()).padStart(2, "0");
			const minutes = String(date.getMinutes()).padStart(2, "0");
			const seconds = String(date.getSeconds()).padStart(2, "0");

			return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
		};

		setInterval(() => {
			if (main.currentServer !== Server.Main) return;
			main.bot.chat(msgs[msgIndex].replace(/\{time\}/g, formatDate(new Date(Date.now() + 7 * 60 * 60 * 1000))));
			msgIndex++;
			if (msgIndex === msgs.length) msgIndex = 0;
		}, autoMessage.interval);
	}

	if (topic.enabled) {
		setInterval(() => {
			if (main.currentServer !== Server.Main) return;
			const clean = (str: string) => {
				return str.replace(/\u00A7[0-9A-FK-OR]|-/ig, "");
			};
			const tlHeader = main.bot.tablist.header;
			const tlFooter = main.bot.tablist.footer;
			const header = clean(tlHeader.json.text);
			const footer = clean(tlFooter.json.text + (tlFooter.extra?.join("") || ""));
			let str = "";

			if (ServerIp.twoYtwoC === main.config.serverInfo.ip)
				str += footer.split("\n").slice(1, 2).join("\n");
			str += `\nTham gia <t:${parseInt(String(main.uptime / 1000))}:R>, cập nhật <t:${parseInt(String(Date.now() / 1000))}:R>`
				+ "\n\n" + header + footer;

			main.channel.setTopic(str);
		}, topic.interval);
	}
}