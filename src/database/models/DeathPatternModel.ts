import { Schema, model, Document } from "mongoose";
import { DeathCause } from "./DeathModel";

export interface IDeathPattern extends Document {
	serverScope: string; // "global" or specific server "2y2c.org", "anarchyvn.net"
	name: string;
	pattern: string; // Regex with named groups: victim, killer, weapon, mob
	cause: DeathCause;
	priority: number;
	enabled: boolean;
	confirmedBy?: string | null;
	sampleMessage?: string;
	createdAt: Date;
	updatedAt: Date;
}

const DeathPatternSchema = new Schema<IDeathPattern>(
	{
		serverScope: { type: String, default: "global", index: true },
		name: { type: String, required: true },
		pattern: { type: String, required: true },
		cause: {
			type: String,
			enum: Object.values(DeathCause),
			default: DeathCause.UNKNOWN,
			required: true,
		},
		priority: { type: Number, default: 0 },
		enabled: { type: Boolean, default: true },
		confirmedBy: { type: String, default: null },
		sampleMessage: { type: String, default: null },
	},
	{ timestamps: true }
);

DeathPatternSchema.index({ serverScope: 1, enabled: 1, priority: -1 });

export const DeathPatternModel = model<IDeathPattern>("DeathPattern", DeathPatternSchema);
