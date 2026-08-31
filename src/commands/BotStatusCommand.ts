import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	ThumbnailBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings";
import { Server } from "../typings";
import { messageColors } from "../utils";

export class BotStatusCommand extends Command {
	constructor() {
		super({
			name: "botstatus",
			aliases: ["status", "bot", "botinfo"],
			description: "Xem thông tin trạng thái, RAM, Uptime và kết nối của Bot",
			usage: ">status hoặc >bot",
			inGameUsage: "!status hoặc !bot",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, client } = ctx;

		if (!bot) {
			await message.reply({ content: "⚠️ Không tìm thấy instance bot cho kênh này." });
			return;
		}

		const memoryUsage = process.memoryUsage();
		const ramMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
		const totalRamMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

		const isConnected = !!bot.bot;
		const isMain = bot.currentServer === Server.Main;
		const statusBadge = !isConnected
			? "🔴 Mất kết nối (Đang chờ reconnect)"
			: isMain
				? "🟢 Đã vào thế giới chính (Main Server)"
				: "🟡 Đang ở hàng chờ (Queue)";

		const uptimeMs = bot.uptime ? Date.now() - bot.uptime : 0;
		const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
		const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
		const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

		const botName = bot.bot?.username || bot.config.connection.username || "mo0nbot";
		const headUrl = `https://mc-heads.net/avatar/${botName}/128.png`;

		const pos = bot.bot?.entity?.position;
		const posStr = pos
			? `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}, Z: ${Math.round(pos.z)}`
			: "Chưa xác định";

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Thông tin trạng thái Bot: ${botName}**\n` +
					`- Trạng thái: **${statusBadge}**\n` +
					`- Máy chủ: \`${bot.config.connection.host}\` (${bot.config.name || "Default"})\n` +
					`- Uptime Bot: **${uptimeStr}**\n` +
					`- Vị trí: \`${posStr}\`\n` +
					`- RAM sử dụng: **${ramMB} MB** / ${totalRamMB} MB`
				)
			)
			.setThumbnailAccessory(
				new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${botName}`)
			);

		const container = new ContainerBuilder()
			.setAccentColor(isMain ? messageColors.join : messageColors.queue)
			.addSectionComponents(section)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`*Ping Discord API: ${client.ws.ping}ms | Gõ \`>pos\` để xem ảnh tọa độ, \`>tab\` để xem tablist.*`
				)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const bot = ctx.bot;
		const isMain = bot.currentServer === Server.Main;
		const uptimeMinutes = bot.uptime ? Math.floor((Date.now() - bot.uptime) / 60000) : 0;
		return `[Status] Bot: ${bot.bot?.username || "mo0nbot"} | Server: ${isMain ? "Main" : "Queue"} | Uptime: ${uptimeMinutes}m`;
	}
}
