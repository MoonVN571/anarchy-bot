import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { Server } from "../typings/types";

export class FollowCommand extends Command {
	constructor() {
		super({
			name: "follow",
			aliases: ["theo"],
			description: "Yêu cầu bot tự động tìm đường đi theo sau người chơi chỉ định",
			usage: ">follow <tên_player>",
			inGameUsage: "!follow [tên_player]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, args } = ctx;

		if (!bot || !bot.bot || bot.currentServer !== Server.Main) {
			await message.reply({ content: "⚠️ Bot hiện không ở trong thế giới chính (Main server)!" });
			return;
		}

		if (args.length === 0) {
			await message.reply({ content: "⚠️ Vui lòng chỉ định tên người chơi cần đi theo: `>follow <player_name>`" });
			return;
		}

		const targetPlayer = args[0];
		const success = bot.smartPathfinderService.followPlayer(targetPlayer);

		const container = new ContainerBuilder()
			.setAccentColor(success ? 0x38bdf8 : 0xef4444)
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						success
							? `🏃 **Đang đi theo sau người chơi \`${targetPlayer}\`!**\n` +
							  `- Cơ chế: Tự động bám sát khoảng cách 3 khối.\n\n` +
							  `*Gõ \`>stop\` để hủy theo sau.*`
							: `❌ **Không tìm thấy người chơi \`${targetPlayer}\` trong tầm nhìn (render distance) của bot!**`
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
		const { bot, sender, args } = ctx;

		if (!bot || !bot.bot || bot.currentServer !== Server.Main) {
			return "[Follow] Bot chua ket noi Main server.";
		}

		const targetPlayer = args.length > 0 ? args[0] : sender;
		const success = bot.smartPathfinderService.followPlayer(targetPlayer);

		return success
			? `[Follow] Dang di theo sau ${targetPlayer}... Go !stop de dung.`
			: `[Follow] Khong tim thay ${targetPlayer} trong render distance!`;
	}
}
