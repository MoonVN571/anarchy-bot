import { Schema, model, Document } from "mongoose";

export interface IStalk extends Document {
	server: string;
	watcher: string; // lowercase
	watcherDisplayName: string;
	target: string; // lowercase
	targetDisplayName: string;
	createdAt: Date;
	updatedAt: Date;
}

const StalkSchema = new Schema<IStalk>(
	{
		server: { type: String, required: true, index: true },
		watcher: { type: String, required: true, lowercase: true, trim: true, index: true },
		watcherDisplayName: { type: String, required: true },
		target: { type: String, required: true, lowercase: true, trim: true, index: true },
		targetDisplayName: { type: String, required: true },
	},
	{
		timestamps: true,
	}
);

// Prevent duplicate stalk entries for same watcher and target on same server
StalkSchema.index({ server: 1, watcher: 1, target: 1 }, { unique: true });
// Index for fast lookup when a target joins/leaves
StalkSchema.index({ server: 1, target: 1 });

export const StalkModel = model<IStalk>("Stalk", StalkSchema);
