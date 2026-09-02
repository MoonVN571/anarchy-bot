import { Document, Schema, model } from "mongoose";

export enum DeathCause {
	PVP = "PVP",
	DEATH = "DEATH",
	UNKNOWN = "UNKNOWN",

	// Legacy causes for backward compatibility with existing DB records
	MOB = "MOB",
	SUICIDE = "SUICIDE",
	VOID = "VOID",
	FALL = "FALL",
	EXPLOSION = "EXPLOSION",
	LAVA = "LAVA",
	DROWN = "DROWN",
	FIRE = "FIRE",
	MAGIC = "MAGIC",
}

export interface IDeath extends Document {
	server: string;
	victim: string;
	victimDisplayName: string;
	killer?: string | null;
	killerDisplayName?: string | null;
	mob?: string | null;
	weapon?: string | null;
	cause: DeathCause;
	rawMessage: string;
	timestamp: Date;
}

const DeathSchema = new Schema<IDeath>(
	{
		server: { type: String, required: true, index: true },
		victim: { type: String, required: true, lowercase: true, trim: true, index: true },
		victimDisplayName: { type: String, required: true },
		killer: { type: String, default: null, lowercase: true, trim: true, index: true },
		killerDisplayName: { type: String, default: null },
		mob: { type: String, default: null },
		weapon: { type: String, default: null },
		cause: {
			type: String,
			enum: Object.values(DeathCause),
			default: DeathCause.UNKNOWN,
			required: true,
		},
		rawMessage: { type: String, required: true },
		timestamp: { type: Date, default: Date.now, index: true },
	},
	{ timestamps: true }
);

DeathSchema.index({ server: 1, timestamp: -1 });
DeathSchema.index({ server: 1, victim: 1, timestamp: -1 });
DeathSchema.index({ server: 1, killer: 1, timestamp: -1 });
DeathSchema.index({ server: 1, cause: 1 });

export const DeathModel = model<IDeath>("Death", DeathSchema);
