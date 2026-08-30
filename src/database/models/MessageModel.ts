import { Schema, model, Document } from "mongoose";

export interface IMessage extends Document {
	server: string;
	username: string;
	displayName: string;
	rank?: string | null;
	message: string;
	type: string;
	timestamp: Date;
}

const MessageSchema = new Schema<IMessage>(
	{
		server: { type: String, required: true, index: true },
		username: { type: String, required: true, lowercase: true, trim: true },
		displayName: { type: String, required: true },
		rank: { type: String, default: null },
		message: { type: String, required: true },
		type: { type: String, default: "chat" },
		timestamp: { type: Date, default: Date.now, index: true },
	},
	{ timestamps: true }
);

MessageSchema.index({ server: 1, timestamp: -1 });
MessageSchema.index({ server: 1, username: 1, timestamp: -1 });

export const MessageModel = model<IMessage>("Message", MessageSchema);
