import { Schema, model, Document } from "mongoose";

export interface IEconomy extends Document {
	server: string;
	username: string; // lowercase
	displayName: string;
	balance: number;
	claimedStarter: boolean; // 500 starter coins claimed once
	workCount: number;
	lastWorkedAt?: Date;
	dailyStreak: number;
	totalWon: number;
	totalLost: number;
	createdAt: Date;
	updatedAt: Date;
}

const EconomySchema = new Schema<IEconomy>(
	{
		server: { type: String, required: true, index: true },
		username: { type: String, required: true, lowercase: true, trim: true, index: true },
		displayName: { type: String, required: true },
		balance: { type: Number, default: 500, min: 0 },
		claimedStarter: { type: Boolean, default: true },
		workCount: { type: Number, default: 0 },
		lastWorkedAt: { type: Date, default: null },
		dailyStreak: { type: Number, default: 0 },
		totalWon: { type: Number, default: 0 },
		totalLost: { type: Number, default: 0 },
	},
	{
		timestamps: true,
	}
);

// Compound unique index for server and username
EconomySchema.index({ server: 1, username: 1 }, { unique: true });
// Leaderboard indexes
EconomySchema.index({ server: 1, balance: -1 });
EconomySchema.index({ server: 1, totalWon: -1 });
EconomySchema.index({ server: 1, totalLost: -1 });
EconomySchema.index({ server: 1, workCount: -1 });

export const EconomyModel = model<IEconomy>("Economy", EconomySchema);
