import { Schema, model, Document } from "mongoose";

export interface IQuote extends Document {
	server: string;
	username: string;
	displayName: string;
	message: string;
	timestamp: Date;
	savedBy: string;
}

const QuoteSchema = new Schema<IQuote>(
	{
		server: { type: String, required: true, index: true },
		username: { type: String, required: true, lowercase: true, trim: true },
		displayName: { type: String, required: true },
		message: { type: String, required: true },
		timestamp: { type: Date, default: Date.now, index: true },
		savedBy: { type: String, default: "auto" },
	},
	{ timestamps: true }
);

QuoteSchema.index({ server: 1, username: 1 });
QuoteSchema.index({ server: 1, timestamp: -1 });

export const QuoteModel = model<IQuote>("Quote", QuoteSchema);
