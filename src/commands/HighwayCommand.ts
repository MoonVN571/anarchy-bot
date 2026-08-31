import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings";
import { Server } from "../typings";

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
			await message.reply({ content: "⚠️ Bot hiện không ở trong thế giới chính (Main server)!" });
			return;
		}

		if (args.length < 2) {
			await message.reply({
				content: "⚠️ Sai cú pháp! Vui lòng dùng: `>highway <+X|-X|+Z|-Z|++|+-|-+|--> <target>` (Ví dụ: `>highway +X 50000` hoặc `>highway ++ 100000`)",
			});
			return;
		}

		const rawAxis = args[0];
		const axis = bot.highwayNavigationService.parseAxis(rawAxis);
		const targetCoord = parseFloat(args[1]);

		if (!axis) {
			await message.reply({ content: "⚠️ Trục cao tốc không hợp lệ! Chọn một trong các trục: `+X`, `-X`, `+Z`, `-Z`, `++`, `+-`, `-+`, `--`." });
			return;
		}

		if (isNaN(targetCoord)) {
			await message.reply({ content: "⚠️ Mốc tọa độ đích phải là chữ số." });
			return;
		}

		const started = await bot.highwayNavigationService.startHighway(axis, targetCoord);

		const container = new ContainerBuilder()
			.setAccentColor(started ? 0x0284c7 : 0xef4444)
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						started
							? `🛣️ **Đã kích hoạt chế độ Highway Navigation Engine!**\n` +
							`- Trục bám đường: **${axis}**\n` +
							`- Mốc tọa độ đích: \`${targetCoord}\`\n` +
							`- Cơ chế: **Auto-Centering + Sprint-jumping trên Ice + Né Portal/Lava**\n\n` +
							`*Gõ \`>stop\` để dừng khẩn cấp bất kỳ lúc nào.*`
							: `❌ **Không thể khởi động bám đường cao tốc!**`
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
			return "[Highway] Bot chua ket noi Main server.";
		}

		if (args.length < 2) {
			return "[Highway] Cu phap: !highway <+X|-X|+Z|-Z|++|+-|-+|--> <target>";
		}

		const axis = bot.highwayNavigationService.parseAxis(args[0]);
		const targetCoord = parseFloat(args[1]);

		if (!axis || isNaN(targetCoord)) {
			return "[Highway] Truc hoac toa do khong hop le!";
		}

		const started = await bot.highwayNavigationService.startHighway(axis, targetCoord);
		return started
			? `[Highway] Dang chay bam truc ${axis} den moc ${targetCoord}... Go !stop de dung.`
			: `[Highway] Loi khoi dong highway navigation.`;
	}
}
