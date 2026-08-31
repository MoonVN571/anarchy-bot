import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { Server } from "../../typings";

export class GotoCommand extends Command {
	constructor() {
		super({
			name: "goto",
			aliases: ["move", "moveto"],
			description: "Điều khiển bot tự động tìm đường đi an toàn đến tọa độ mục tiêu",
			usage: ">goto <x> [y] <z>",
			inGameUsage: "!goto <x> [y] <z>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, args } = ctx;

		if (!bot || !bot.bot || bot.currentServer !== Server.Main) {
			await message.reply({ content: "[Cảnh báo] Bot hiện không ở trong thế giới chính (Main server) để di chuyển!" });
			return;
		}

		if (args.length < 2) {
			await message.reply({ content: "[Cảnh báo] Sai cú pháp! Vui lòng dùng: `>goto <x> [y] <z>` (Ví dụ: `>goto 100 200` hoặc `>goto 100 64 200`)" });
			return;
		}

		let x: number, y: number | undefined, z: number;
		if (args.length === 2) {
			x = parseFloat(args[0]);
			z = parseFloat(args[1]);
		} else {
			x = parseFloat(args[0]);
			y = parseFloat(args[1]);
			z = parseFloat(args[2]);
		}

		if (isNaN(x) || isNaN(z) || (y !== undefined && isNaN(y))) {
			await message.reply({ content: "[Cảnh báo] Tọa độ không hợp lệ! X, Y, Z phải là các chữ số." });
			return;
		}

		const success = await bot.smartPathfinderService.moveTo(x, y, z);
		const targetStr = y !== undefined ? `(${x}, ${y}, ${z})` : `(${x}, ~${Math.round(bot.bot.entity.position.y)}, ${z})`;

		const container = new ContainerBuilder()
			.setAccentColor(success ? 0x38bdf8 : 0xef4444)
			.addSectionComponents(
				new SectionBuilder().addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						success
							? `**Đang điều hướng di chuyển...**\n` +
							`- Điểm đích: \`${targetStr}\`\n` +
							`- Vị trí hiện tại: \`(${Math.round(bot.bot.entity.position.x)}, ${Math.round(bot.bot.entity.position.y)}, ${Math.round(bot.bot.entity.position.z)})\`\n` +
							`- Trạng thái: **Đang di chuyển thông minh (Né lava & portal)**\n\n` +
							`*Gõ \`>stop\` để dừng di chuyển bất kỳ lúc nào.*`
							: `**Không thể thiết lập đường đi tới \`${targetStr}\`!**`
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
			return "[Goto] Bot chưa kết nối vào thế giới chính.";
		}

		if (args.length < 2) {
			return "[Goto] Cú pháp: !goto <x> [y] <z>";
		}

		let x: number, y: number | undefined, z: number;
		if (args.length === 2) {
			x = parseFloat(args[0]);
			z = parseFloat(args[1]);
		} else {
			x = parseFloat(args[0]);
			y = parseFloat(args[1]);
			z = parseFloat(args[2]);
		}

		if (isNaN(x) || isNaN(z) || (y !== undefined && isNaN(y))) {
			return "[Goto] Tọa độ không hợp lệ!";
		}

		const success = await bot.smartPathfinderService.moveTo(x, y, z);
		const targetDisplay = y !== undefined ? `(${x}, ${y}, ${z})` : `(${x}, ${z})`;
		return success
			? `[Goto] Đang di chuyển đến ${targetDisplay}... Gõ !stop để dừng.`
			: `[Goto] Không thể tìm đường đến (${x}, ${z})!`;
	}
}
