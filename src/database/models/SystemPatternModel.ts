import { Schema, model, Document } from "mongoose";

export interface ISystemPattern extends Document {
	serverScope: string; // "global" or specific server IP (e.g. "2y2c.org")
	name: string;
	pattern: string; // Regex pattern string
	category: "announcement" | "restart" | "queue" | "tip" | "reward" | "navigation" | "general";
	priority: number;
	enabled: boolean;
	sampleMessage?: string;
	confirmedBy?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const SystemPatternSchema = new Schema<ISystemPattern>(
	{
		serverScope: { type: String, default: "global", index: true },
		name: { type: String, required: true },
		pattern: { type: String, required: true },
		category: {
			type: String,
			enum: ["announcement", "restart", "queue", "tip", "reward", "navigation", "general"],
			default: "general",
		},
		priority: { type: Number, default: 0, index: true },
		enabled: { type: Boolean, default: true, index: true },
		sampleMessage: { type: String },
		confirmedBy: { type: String, default: null },
	},
	{ timestamps: true }
);

SystemPatternSchema.index({ serverScope: 1, enabled: 1 });

export const SystemPatternModel = model<ISystemPattern>("SystemPattern", SystemPatternSchema);
