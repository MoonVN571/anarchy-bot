import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";

export class AntiAfkCommand extends Command {
	constructor() {
		super({
			name: "antiafk",
			aliases: ["afk"],
			description: "Bật hoặc tắt chế độ mô phỏng hành vi ngẫu nhiên chống AFK kick",
			usage: ">antiafk <on|off>",
			inGameUsage: "!antiafk <on|off>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, args } = ctx;

		if (!bot || !bot.bot) {
			await message.reply({ content: "⚠️ Không tìm thấy instance bot!" });
			return;
		}

		if (args.length > 0) {
			const mode = args[0].toLowerCase();
			if (mode === "on" || mode === "enable" || mode === "bat") {
				bot.antiAfkService.setEnabled(true);
			} else if (mode === "off" || mode === "disable" || mode === "tat") {
				bot.antiAfkService.setEnabled(false);
			}
		}

		const isEnabled = bot.antiAfkService.isEnabled;
		const minSec = Math.round(bot.antiAfkService.minIntervalMs / 1000);
		const maxSec = Math.round(bot.antiAfkService.maxIntervalMs / 1000);

		const container = new ContainerBuilder()
			.setAccentColor(isEnabled ? 0x22c55e : 0x64748b)
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`💤 **Quản lý Smart Anti-AFK Engine**\n` +
						`- Trạng thái: **${isEnabled ? "🟢 Đang BẬT" : "🔴 Đang TẮT"}**\n` +
						`- Tần suất ngẫu nhiên: **${minSec}s - ${maxSec}s**\n` +
						`- Hành động: *Xoay camera ±15°-45°, Micro-step an toàn, Vung tay, Sneak, Nhảy*\n` +
						`- Safety Guard: *Tự động tránh vực sâu, hồ dung nham/nước*\n\n` +
						`*Dùng \`>antiafk on/off\` để bật/tắt.*`
					)
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const { bot, args } = ctx;

		if (!bot || !bot.bot) {
			return "[AntiAFK] Bot chua ket noi.";
		}

		if (args.length > 0) {
			const mode = args[0].toLowerCase();
			if (mode === "on" || mode === "enable") {
				bot.antiAfkService.setEnabled(true);
				return `[AntiAFK] Da BAT Smart Anti-AFK.`;
			} else if (mode === "off" || mode === "disable") {
				bot.antiAfkService.setEnabled(false);
				return `[AntiAFK] Da TAT Smart Anti-AFK.`;
			}
		}

		return `[AntiAFK] Trang thai: ${bot.antiAfkService.isEnabled ? "ON" : "OFF"}`;
	}
}
