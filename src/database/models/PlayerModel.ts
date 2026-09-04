import { Schema, model, Document } from "mongoose";

export interface IPlayer extends Document {
	server: string;
	username: string;
	displayName: string;
	uuid?: string;
	firstSeen: Date;
	joinDate: Date; // Alias of firstSeen
	lastSeen: Date;
	lastJoin?: Date;
	lastQuit?: Date;
	joinCount: number;
	leaveCount: number;
	playtime: number; // In seconds
	isOnline: boolean;
	messageCount: number;
	kills: number;
	deaths: number;
	suicides: number;
	mobDeaths: number;
	kdRatio: number;
	highestKillstreak: number;
	currentKillstreak: number;
	healthWarning?: boolean; // Continuous session reminder toggle (default: true)
	createdAt: Date;
	updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
	{
		server: { type: String, required: true, index: true },
		username: { type: String, required: true, lowercase: true, trim: true },
		displayName: { type: String, required: true },
		uuid: { type: String, index: true },
		firstSeen: { type: Date, default: Date.now, index: true },
		lastSeen: { type: Date, default: Date.now, index: true },
		lastJoin: { type: Date, default: Date.now },
		lastQuit: { type: Date, default: null },
		joinCount: { type: Number, default: 1 },
		leaveCount: { type: Number, default: 0 },
		playtime: { type: Number, default: 0 },
		isOnline: { type: Boolean, default: false },
		messageCount: { type: Number, default: 0 },
		kills: { type: Number, default: 0 },
		deaths: { type: Number, default: 0 },
		suicides: { type: Number, default: 0 },
		mobDeaths: { type: Number, default: 0 },
		kdRatio: { type: Number, default: 0 },
		highestKillstreak: { type: Number, default: 0 },
		currentKillstreak: { type: Number, default: 0 },
		healthWarning: { type: Boolean, default: true },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
);

// Virtual alias: joinDate -> firstSeen
PlayerSchema.virtual("joinDate")
	.get(function () {
		return this.firstSeen;
	})
	.set(function (val: Date) {
		this.firstSeen = val;
	});

// Compound Unique Index: One player record per server
PlayerSchema.index({ server: 1, username: 1 }, { unique: true });
PlayerSchema.index({ server: 1, playtime: -1 });
PlayerSchema.index({ server: 1, kills: -1 });
PlayerSchema.index({ server: 1, deaths: -1 });
PlayerSchema.index({ server: 1, kdRatio: -1 });
PlayerSchema.index({ server: 1, messageCount: -1 });
PlayerSchema.index({ server: 1, firstSeen: 1 });
PlayerSchema.index({ server: 1, lastSeen: -1 });

export const PlayerModel = model<IPlayer>("Player", PlayerSchema);

