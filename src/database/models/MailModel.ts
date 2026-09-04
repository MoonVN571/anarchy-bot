import { Schema, model, Document } from "mongoose";

export interface IMail extends Document {
	server: string;
	sender: string;
	senderPlatform: "discord" | "minecraft";
	senderId?: string | null;
	channelId?: string | null;
	receiver: string;
	receiverDisplayName: string;
	message: string;
	isDelivered: boolean;
	deliveredAt?: Date | null;
	deliveryNotified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const MailSchema = new Schema<IMail>(
	{
		server: { type: String, required: true, index: true },
		sender: { type: String, required: true },
		senderPlatform: { type: String, enum: ["discord", "minecraft"], required: true },
		senderId: { type: String, default: null },
		channelId: { type: String, default: null },
		receiver: { type: String, required: true, lowercase: true, trim: true, index: true },
		receiverDisplayName: { type: String, required: true },
		message: { type: String, required: true, maxlength: 256 },
		isDelivered: { type: Boolean, default: false, index: true },
		deliveredAt: { type: Date, default: null },
		deliveryNotified: { type: Boolean, default: false, index: true },
		createdAt: { type: Date, default: Date.now, index: true },
	},
	{ timestamps: true }
);

// TTL index: auto delete mails older than 14 days
MailSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });
MailSchema.index({ server: 1, receiver: 1, isDelivered: 1 });
MailSchema.index({ server: 1, sender: 1, deliveryNotified: 1 });

export const MailModel = model<IMail>("Mail", MailSchema);
