import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { Server } from "../../typings";

export class HighwayCommand extends Command {
	constructor() {
		super({
			name: "highway",
			aliases: ["hw", "highwaybot"],
			description: "Tự động căn giữa làn và chạy bám trục cao tốc Nether/Overworld",
			usage: ">highway <+X|-X|+Z|-Z|++|+-|-+|--> <target_coord>",
			inGameUsage: "!highway <trục> <mốc_tọa_độ>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, args } = ctx;

		if (!bot || !bot.bot || bot.currentServer !== Server.Main) {
			await message.reply({ content: "[Cảnh báo] Bot hiện không ở trong thế giới chính (Main server)!" });
			return;
		}

		if (args.length === 1 && (args[0].toLowerCase() === "status" || args[0].toLowerCase() === "info")) {
			const status = bot.highwayNavigationService.getStatus();
			const lastReason = bot.highwayNavigationService.getLastStopReason();
			const pos = bot.bot.entity?.position;
			const posStr = pos ? `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})` : "unknown";

			const infoText = status?.active
				? `**Trạng thái Highway Navigation: [Đang chạy]**\n` +
				  `- Trục: \`${status.axis}\` | Tọa độ đích: \`${status.targetCoord}\`\n` +
				  `- Vị trí hiện tại: \`${posStr}\`\n` +
				  `- Tốc độ thực tế: \`${status.currentSpeedBps.toFixed(1)} bps (blocks/s)\`\n` +
				  `- Thời gian di chuyển: \`${((Date.now() - status.startTime) / 1000).toFixed(0)}s\``
				: `**Trạng thái Highway Navigation: [Đang dừng]**\n` +
				  `- Vị trí hiện tại: \`${posStr}\`\n` +
				  `- Lý do dừng gần nhất: \`${lastReason}\``;

			const container = new ContainerBuilder()
				.setAccentColor(status?.active ? 0x0284c7 : 0x71717a)
				.addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(infoText)))
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
			return;
		}

		if (args.length < 2) {
			await message.reply({
				content: "[Cảnh báo] Sai cú pháp! Vui lòng dùng: `>highway <+X|-X|+Z|-Z|++|+-|-+|--> <target>` (Ví dụ: `>highway +X 50000` hoặc `>highway status`)",
			});
			return;
		}

		const rawAxis = args[0];
		const axis = bot.highwayNavigationService.parseAxis(rawAxis);
		const targetCoord = parseFloat(args[1]);

		if (!axis) {
			await message.reply({ content: "[Cảnh báo] Trục cao tốc không hợp lệ! Chọn một trong các trục: `+X`, `-X`, `+Z`, `-Z`, `++`, `+-`, `-+`, `--`." });
			return;
		}

		if (isNaN(targetCoord)) {
			await message.reply({ content: "[Cảnh báo] Mốc tọa độ đích phải là chữ số." });
			return;
		}

		const started = await bot.highwayNavigationService.startHighway(axis, targetCoord);

		const container = new ContainerBuilder()
			.setAccentColor(started ? 0x0284c7 : 0xef4444)
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						started
							? `**Đã kích hoạt chế độ Highway Navigation Engine!**\n` +
							`- Trục bám đường: **${axis}**\n` +
							`- Mốc tọa độ đích: \`${targetCoord}\`\n` +
							`- Cơ chế: **Auto-Centering + Sprint-jumping trên Ice + Né Portal/Lava**\n\n` +
							`*Gõ \`>highway status\` để xem tốc độ/trạng thái hoặc \`>stop\` để dừng.*`
							: `**Không thể khởi động bám đường cao tốc!**`
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

		if (!bot || !bot.bot || bot.currentServer !== Server.Main) {
			return "[Highway] Bot chưa kết nối vào thế giới chính.";
		}

		if (args.length === 1 && (args[0].toLowerCase() === "status" || args[0].toLowerCase() === "info")) {
			const status = bot.highwayNavigationService.getStatus();
			const lastReason = bot.highwayNavigationService.getLastStopReason();
			const pos = bot.bot.entity?.position;
			const posStr = pos ? `(${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})` : "unknown";

			return status?.active
				? `[Highway] Đang chạy trục ${status.axis} đến ${status.targetCoord} | Pos: ${posStr} | Tốc độ: ${status.currentSpeedBps.toFixed(1)} bps`
				: `[Highway] Đang dừng | Pos: ${posStr} | Lý do dừng gần nhất: ${lastReason}`;
		}

		if (args.length < 2) {
			return "[Highway] Cú pháp: !highway <+X|-X|+Z|-Z|++|+-|-+|--> <mốc_tọa_độ> hoặc !highway status";
		}

		const axis = bot.highwayNavigationService.parseAxis(args[0]);
		const targetCoord = parseFloat(args[1]);

		if (!axis || isNaN(targetCoord)) {
			return "[Highway] Trục hoặc tọa độ không hợp lệ!";
		}

		const started = await bot.highwayNavigationService.startHighway(axis, targetCoord, ctx.sender);
		return started
			? `[Highway] Đang chạy bám trục ${axis} đến mốc ${targetCoord}... Gõ !stop để dừng.`
			: `[Highway] Lỗi khởi động di chuyển cao tốc.`;
	}
}
