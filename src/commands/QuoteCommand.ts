import { EmbedBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { QuoteService } from "../services/QuoteService";

export class QuoteCommand extends Command {
	constructor() {
		super({
			name: "quote",
			aliases: ["q", "trichdan"],
			description: "Lấy ngẫu nhiên một câu trích dẫn bất hủ của người chơi",
			usage: ">quote [tên_người_chơi]",
			inGameUsage: "!quote [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		const quote = await QuoteService.getRandomQuote(serverHost, targetUser);

		if (!quote) {
			if (targetUser) {
				await message.reply({
					content: `Chưa có trích dẫn nào được ghi nhận cho người chơi **${targetUser}** trên server \`${serverHost}\`.`,
				});
			} else {
				await message.reply({
					content: `Chưa có trích dẫn nào được ghi nhận trên server \`${serverHost}\`.`,
				});
			}
			return;
		}

		const totalQuotes = await QuoteService.getQuotesCount(serverHost, quote.username);

		const embed = new EmbedBuilder()
			.setColor(0xf1c40f)
			.setAuthor({
				name: `${quote.displayName || quote.username}`,
				iconURL: `https://mc-heads.net/avatar/${quote.username}/64`,
			})
			.setDescription(`*“ ${quote.message} ”*`)
			.setFooter({
				text: `Server: ${serverHost} | Tổng trích dẫn của player: ${totalQuotes}`,
			})
			.setTimestamp(quote.timestamp);

		await message.reply({ embeds: [embed] });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const targetUser = ctx.args[0];
		const quote = await QuoteService.getRandomQuote(ctx.serverHost, targetUser);

		if (!quote) {
			return targetUser
				? `[Quote] Khong tim thay trich dan nao cua player "${targetUser}".`
				: `[Quote] Khong co trich dan nao duoc luu tren server.`;
		}

		return `[Quote] <${quote.displayName || quote.username}>: "${quote.message}"`;
	}
}
