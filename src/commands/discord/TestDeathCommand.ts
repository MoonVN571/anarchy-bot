import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { DeathCause } from "../../database/models/DeathModel";
import { DeathParserService } from "../../services/analytics/DeathParserService";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { messageColors } from "../../utils/minecraft/chatParser";

export class TestDeathCommand extends Command {
	constructor() {
		super({
			name: "testdeath",
			aliases: ["checkdeath", "deathcheck", "testd"],
			description: "Dev: Kiểm tra và mô phỏng phân tích tin nhắn tử vong / Regex / Bot Message",
			usage: ">testdeath <nội dung tin nhắn>",
			inGameUsage: "!testdeath <nội dung tin nhắn>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, bot, client, serverHost } = ctx;

		if (!args || args.length === 0) {
			await message.reply({
				content: "Cú pháp: `>testdeath <nội dung câu tin nhắn tử vong cần kiểm tra>`\nVí dụ: `>testdeath Zun_HYPERVN đã bị tiêu diệt bởi kiendeptrai cầm [Kiếm]`",
			});
			return;
		}

		const testMsg = args.join(" ").trim();
		const serverIp = serverHost || bot?.config?.connection?.host || "global";

		client.logger.info(`[TestDeathCommand] Testing message by ${message.author.tag}: "${testMsg}"`);

		// 1. Check direct match with active regexes (default + database)
		const parseResult = DeathParserService.extractDeathInfoSync(serverIp, testMsg);

		// 2. Check Bot Message escaping test (Part 1: escape `>` to `\>`)
		const hasQuoteSymbol = testMsg.startsWith(">") || testMsg.includes("\n>");
		const escapedBotMsg = testMsg.replace(/^>/gm, "\\>");

		const container = new ContainerBuilder();

		if (parseResult) {
			// Matched directly
			const victim = parseResult.victim;
			const killer = parseResult.killer || null;
			const mob = parseResult.mob || null;
			const weapon = parseResult.weapon || null;
			const cause = parseResult.cause;

			const victimHead = `https://mc-heads.net/avatar/${victim}/64.png`;
			const isPvP = cause === DeathCause.PVP && killer !== null;

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Kiểm Tra Regex Tử Vong (Kết Quả: ĐÃ KHỚP)**\n\n` +
						`- **Máy chủ:** \`${serverIp}\`\n` +
						`- **Phân loại (Cause):** \`${cause}\` ${isPvP ? "*(Hợp lệ để tính K/D)*" : "*(Tử vong thường, không tính K/D)*"}\n` +
						`- **Nạn nhân (Victim):** \`${victim}\`\n` +
						(killer ? `- **Kẻ hạ gục (Killer):** \`${killer}\`\n` : "") +
						(mob ? `- **Quái vật (Mob):** \`${mob}\`\n` : "") +
						(weapon ? `- **Vũ khí (Weapon):** \`${weapon}\`\n` : "")
					)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(victimHead).setDescription(`Victim: ${victim}`));

			container
				.setAccentColor(isPvP ? messageColors.dead : 0x3498db)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Tin nhắn kiểm tra:**\n\`\`\`${testMsg}\`\`\`\n` +
						(hasQuoteSymbol
							? `**Bot Message Escaping Check:**\n\`\`\`${escapedBotMsg}\`\`\` *(Đã thêm \\> để tránh Discord Quote Block)*\n`
							: "") +
						`*Trạng thái: Khớp mẫu Regex thành công.*`
					)
				);
		} else {
			// Unmatched -> Test dynamic learner simulation
			const botPlayers = bot?.bot?.players ? Object.keys(bot.bot.players) : [];

			container
				.setAccentColor(0xf39c12)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Kiểm Tra Regex Tử Vong (Kết Quả: CHƯA KHỚP - Chuyển Learner)**\n\n` +
						`- **Máy chủ:** \`${serverIp}\`\n` +
						`- **Tin nhắn:** \`\`\`${testMsg}\`\`\`\n` +
						`- **Người chơi Mineflayer Bot thấy online:** ${botPlayers.length > 0 ? botPlayers.map(p => `\`${p}\``).join(", ") : "*Không có (Bot offline hoặc trống)*"}\n\n` +
						`*Tin nhắn này khi xuất hiện trong game sẽ kích hoạt hệ thống tự động học (DeathRegexLearner) để Admin duyệt trên Discord.*`
					)
				);

			if (hasQuoteSymbol) {
				container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
				container.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Bot Message Escaping Check:**\n\`\`\`${escapedBotMsg}\`\`\`\n*(Ký tự \`>\` đã được escape thành \`\\>\` chuẩn)*`
					)
				);
			}
		}

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(_ctx: InGameCommandContext): Promise<string | void> {
		return "[TestDeath] Lệnh này chỉ khả dụng trên Discord dành cho Admin/Dev.";
	}
}
