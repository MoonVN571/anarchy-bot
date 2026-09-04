import { Schema, model, Document } from "mongoose";

export interface INote extends Document {
	server: string;
	username: string; // lowercase
	displayName: string;
	content: string;
	hasCoords: boolean;
	sharedWith: string[]; // lowercase usernames allowed to view this note
	createdAt: Date;
	updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
	{
		server: { type: String, required: true, index: true },
		username: { type: String, required: true, lowercase: true, trim: true, index: true },
		displayName: { type: String, required: true },
		content: { type: String, required: true, trim: true },
		hasCoords: { type: Boolean, default: false },
		sharedWith: { type: [String], default: [] },
	},
	{
		timestamps: true,
	}
);

// Compound index for querying a player's notes on a server
NoteSchema.index({ server: 1, username: 1, createdAt: -1 });
// Index for querying notes shared with a player
NoteSchema.index({ server: 1, sharedWith: 1 });

export const NoteModel = model<INote>("Note", NoteSchema);
