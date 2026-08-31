import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";

export class StopCommand extends Command {
	constructor() {
		super({
			name: "stop",
			aliases: ["halt", "cancel", "dung"],
			description: "Dừng khẩn cấp mọi hành vi di chuyển (Pathfinder, Highway, Walk)",
			usage: ">stop",
			inGameUsage: "!stop",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot } = ctx;

		if (!bot || !bot.bot) {
			await message.reply({ content: "⚠️ Không tìm thấy instance bot!" });
			return;
		}

		bot.smartPathfinderService?.stop();
		bot.highwayNavigationService?.stop();

		const container = new ContainerBuilder()
			.setAccentColor(0xef4444)
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`🛑 **Đã kích hoạt Phanh Khẩn Cấp (Emergency Stop)!**\n` +
						`- Đã hủy toàn bộ mục tiêu tìm đường (Pathfinder / Highway).\n` +
						`- Đã nhả toàn bộ phím điều hướng và ổn định nhân vật tại khối an toàn.\n` +
						`- Đã tiếp tục chế độ Smart Anti-AFK.`
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
		const { bot } = ctx;

		if (!bot || !bot.bot) {
			return "[Stop] Bot chua ket noi.";
		}

		bot.smartPathfinderService?.stop();
		bot.highwayNavigationService?.stop();

		return `[Stop] Da huy toan bo di chuyen va dung lai an toan.`;
	}
}
