import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";

export class TotemCommand extends Command {
	constructor() {
		super({
			name: "totem",
			aliases: ["autototem", "offhand"],
			description: "Tự động kiểm tra balo và lắp Totem of Undying vào tay phụ (Offhand)",
			usage: ">totem [on|off]",
			inGameUsage: "!totem [on|off]",
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
			if (mode === "on" || mode === "enable") {
				bot.autoEatService.isTotemEnabled = true;
			} else if (mode === "off" || mode === "disable") {
				bot.autoEatService.isTotemEnabled = false;
			}
		}

		const equipped = await bot.autoEatService.checkAndEquipTotem();
		const totemCount = bot.bot.inventory.items().filter((i) => i.name === "totem_of_undying").length;
		const offhandItem = bot.bot.inventory.slots[bot.bot.getEquipmentDestSlot("off-hand")];
		const isHoldingTotem = offhandItem?.name === "totem_of_undying";

		const container = new ContainerBuilder()
			.setAccentColor(isHoldingTotem ? 0x10b981 : 0xf59e0b)
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`🛡️ **Quản lý Totem of Undying (Tay phụ / Offhand)**\n` +
						`- Auto-Totem Keeper: **${bot.autoEatService.isTotemEnabled ? "🟢 Đang BẬT" : "🔴 Đang TẮT"}**\n` +
						`- Số lượng Totem trong túi đồ: **${totemCount}**\n` +
						`- Vật phẩm tay phụ hiện tại: \`${offhandItem?.name || "Trống"}\`\n` +
						`- Kết quả trang bị: **${equipped || isHoldingTotem ? "Đã giữ Totem ở tay phụ ✅" : "Không có Totem để trang bị ⚠️"}**`
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
			return "[Totem] Bot chua ket noi.";
		}

		if (args.length > 0) {
			const mode = args[0].toLowerCase();
			if (mode === "on") bot.autoEatService.isTotemEnabled = true;
			if (mode === "off") bot.autoEatService.isTotemEnabled = false;
		}

		const equipped = await bot.autoEatService.checkAndEquipTotem();
		const totemCount = bot.bot.inventory.items().filter((i) => i.name === "totem_of_undying").length;

		return `[Totem] Auto: ${bot.autoEatService.isTotemEnabled ? "ON" : "OFF"} | Kho: ${totemCount} Totems | Result: ${equipped ? "Da lap Totem vao tay phu" : "Khong co Totem"}`;
	}
}
