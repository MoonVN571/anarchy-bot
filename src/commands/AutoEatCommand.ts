import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings";
import { isToggleOff, isToggleOn, removeVietnameseDiacritics } from "../utils";

export class AutoEatCommand extends Command {
	constructor() {
		super({
			name: "autoeat",
			aliases: ["eat"],
			description: "Bật/Tắt chế độ tự động ăn hoặc ép bot ăn ngay lập tức",
			usage: ">autoeat <on|off|bật|tắt> hoặc >eat / >ăn",
			inGameUsage: "!autoeat <on|off|bật|tắt> hoặc !eat / !ăn",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, args, commandName } = ctx;

		if (!bot || !bot.bot) {
			await message.reply({ content: "⚠️ Không tìm thấy instance bot!" });
			return;
		}

		const cleanCmd = removeVietnameseDiacritics(commandName.toLowerCase());
		if (cleanCmd === "eat" || cleanCmd === "an" || (args.length > 0 && ["now", "ngay", "luon", "ngaylapuc"].includes(removeVietnameseDiacritics(args[0].toLowerCase())))) {
			const success = await bot.autoEatService.checkAndEat(true);
			const container = new ContainerBuilder()
				.setAccentColor(success ? 0x22c55e : 0xf59e0b)
				.addSectionComponents(
					new SectionBuilder().addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							success
								? `🍖 **Bot đang tiến hành ăn thức ăn trong túi đồ...**`
								: `⚠️ **Không tìm thấy thức ăn phù hợp hoặc bot không thể ăn lúc này.**`
						)
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

			await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
			return;
		}

		if (args.length > 0) {
			if (isToggleOn(args[0])) {
				bot.autoEatService.isEnabled = true;
			} else if (isToggleOff(args[0])) {
				bot.autoEatService.isEnabled = false;
			}
		}

		const statusStr = bot.autoEatService.isEnabled ? "🟢 Đang BẬT" : "🔴 Đang TẮT";
		const thresholdStr = `${bot.autoEatService.threshold}/20`;

		const container = new ContainerBuilder()
			.setAccentColor(bot.autoEatService.isEnabled ? 0x22c55e : 0x64748b)
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`🍖 **Cấu hình Quản lý Thức ăn (Auto-Eat)**\n` +
						`- Trạng thái: **${statusStr}**\n` +
						`- Mức đói kích hoạt ăn: **${thresholdStr}**\n` +
						`- Ưu tiên thực phẩm: \`Golden Carrot\` > \`Cooked Meat\` > \`Bread\` > \`Gapple (Low HP)\`\n\n` +
						`*Dùng \`>autoeat on/off\` để đổi trạng thái hoặc \`>eat\` để ép ăn ngay.*`
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
		const { bot, args, commandName } = ctx;

		if (!bot || !bot.bot) {
			return "[AutoEat] Bot chua ket noi.";
		}

		const cleanCmd = removeVietnameseDiacritics(commandName.toLowerCase());
		if (cleanCmd === "eat" || cleanCmd === "an" || (args.length > 0 && ["now", "ngay", "luon"].includes(removeVietnameseDiacritics(args[0].toLowerCase())))) {
			const success = await bot.autoEatService.checkAndEat(true);
			return success ? `[AutoEat] Đang ăn thức ăn...` : `[AutoEat] Không tìm thấy thức ăn phù hợp.`;
		}

		if (args.length > 0) {
			if (isToggleOn(args[0])) {
				bot.autoEatService.isEnabled = true;
				return `[AutoEat] Đã BẬT chế độ tự động ăn.`;
			} else if (isToggleOff(args[0])) {
				bot.autoEatService.isEnabled = false;
				return `[AutoEat] Đã TẮT chế độ tự động ăn.`;
			}
		}

		return `[AutoEat] Trạng thái: ${bot.autoEatService.isEnabled ? "BẬT" : "TẮT"} (Mức đói: ${bot.autoEatService.threshold}/20)`;
	}
}
