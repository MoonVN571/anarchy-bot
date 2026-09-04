import { Schema, model, Document } from "mongoose";

export interface ILotteryTicket {
	username: string; // lowercase
	displayName: string;
	ticketCount: number;
}

export interface ILotteryWinner {
	username: string;
	displayName: string;
	amount: number;
	wonAt: Date;
}

export interface ILottery extends Document {
	server: string;
	round: number;
	jackpotPool: number;
	ticketPrice: number;
	tickets: ILotteryTicket[];
	lastWinner?: ILotteryWinner;
	createdAt: Date;
	updatedAt: Date;
}

const LotteryTicketSchema = new Schema<ILotteryTicket>(
	{
		username: { type: String, required: true, lowercase: true, trim: true },
		displayName: { type: String, required: true },
		ticketCount: { type: Number, required: true, min: 1 },
	},
	{ _id: false }
);

const LotterySchema = new Schema<ILottery>(
	{
		server: { type: String, required: true, index: true },
		round: { type: Number, default: 1 },
		jackpotPool: { type: Number, default: 1000, min: 0 },
		ticketPrice: { type: Number, default: 50, min: 1 },
		tickets: { type: [LotteryTicketSchema], default: [] },
		lastWinner: {
			username: { type: String },
			displayName: { type: String },
			amount: { type: Number },
			wonAt: { type: Date },
		},
	},
	{
		timestamps: true,
	}
);

LotterySchema.index({ server: 1 }, { unique: true });

export const LotteryModel = model<ILottery>("Lottery", LotterySchema);
