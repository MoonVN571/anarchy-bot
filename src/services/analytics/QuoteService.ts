import { QuoteModel, IQuote } from "../../database/models/QuoteModel";
import logger from "../../structures/Logger";

export class QuoteService {
	/**
	 * Save a chat message as a quote if it meets quality criteria
	 */
	public static async recordPotentialQuote(
		server: string,
		username: string,
		displayName: string,
		message: string,
		savedBy: string = "auto"
	): Promise<IQuote | null> {
		if (!message || !username) return null;

		const cleanMsg = message.trim();

		// Filter out commands, short messages, system spam, or URLs
		if (
			cleanMsg.length < 5 ||
			cleanMsg.length > 250 ||
			cleanMsg.startsWith("/") ||
			cleanMsg.startsWith("!") ||
			cleanMsg.startsWith(".") ||
			cleanMsg.includes("http://") ||
			cleanMsg.includes("https://") ||
			cleanMsg.toLowerCase().includes("discord.gg") ||
			cleanMsg.toLowerCase().includes("/login") ||
			cleanMsg.toLowerCase().includes("/reg")
		) {
			return null;
		}

		// Probability check for auto saving (e.g. 20% of eligible messages or unique quotes)
		if (savedBy === "auto" && Math.random() > 0.3) {
			return null;
		}

		try {
			// Avoid exact duplicate quote for the same user in the last 24h
			const exists = await QuoteModel.findOne({
				server,
				username: username.toLowerCase(),
				message: cleanMsg,
			});

			if (exists) return null;

			const quote = await QuoteModel.create({
				server,
				username: username.toLowerCase(),
				displayName,
				message: cleanMsg,
				timestamp: new Date(),
				savedBy,
			});

			logger.debug("Quote", `[${server}] Saved quote for "${displayName}": "${cleanMsg}"`);
			return quote;
		} catch {
			return null;
		}
	}

	/**
	 * Get a random quote from a player or server
	 */
	public static async getRandomQuote(server: string, username?: string): Promise<IQuote | null> {
		try {
			const matchFilter: any = { server };
			if (username) {
				matchFilter.username = username.toLowerCase().trim();
			}

			const quotes = await QuoteModel.aggregate([
				{ $match: matchFilter },
				{ $sample: { size: 1 } },
			]);

			return quotes.length > 0 ? quotes[0] : null;
		} catch {
			return null;
		}
	}

	/**
	 * Get total quotes count
	 */
	public static async getQuotesCount(server: string, username?: string): Promise<number> {
		try {
			const matchFilter: any = { server };
			if (username) {
				matchFilter.username = username.toLowerCase().trim();
			}
			return await QuoteModel.countDocuments(matchFilter);
		} catch {
			return 0;
		}
	}
}
