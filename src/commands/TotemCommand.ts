import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { isToggleOn, isToggleOff } from "../utils/vietnameseUtils";

export class TotemCommand extends Command {
	constructor() {
		super({
			name: "totem",
			aliases: ["autototem", "offhand"],
			description: "Tự động kiểm tra balo và lắp Totem of Undying vào tay phụ (Offhand)",
			usage: ">totem [on|off|bật|tắt]",
			inGameUsage: "!totem [on|off|bật|tắt]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, args } = ctx;

		if (!bot || !bot.bot) {
			await message.reply({ content: "⚠️ Không tìm thấy instance bot!" });
			return;
		}

		if (args.length > 0) {
			if (isToggleOn(args[0])) {
				bot.autoEatService.isTotemEnabled = true;
			} else if (isToggleOff(args[0])) {
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
			return "[Totem] Bot chưa kết nối.";
		}

		if (args.length > 0) {
			if (isToggleOn(args[0])) bot.autoEatService.isTotemEnabled = true;
			if (isToggleOff(args[0])) bot.autoEatService.isTotemEnabled = false;
		}

		const equipped = await bot.autoEatService.checkAndEquipTotem();
		const totemCount = bot.bot.inventory.items().filter((i) => i.name === "totem_of_undying").length;

		return `[Totem] Tự động: ${bot.autoEatService.isTotemEnabled ? "BẬT" : "TẮT"} | Kho: ${totemCount} Totems | Kết quả: ${equipped ? "Đã lắp Totem vào tay phụ" : "Không có Totem"}`;
	}
}

