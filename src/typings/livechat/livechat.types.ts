import { Server } from "../minecraft/enums";

export interface LiveChatMessageEnvelope {
	id?: string;
	server: Server;
	sender: string;
	message: string;
	timestamp: Date | number;
	type?: "chat" | "death" | "system" | "whisper" | "advancement";
	formattedText?: string;
	rawText?: string;
	channel?: string;
	avatarUrl?: string;
}

export interface LiveChatRenderPayload {
	server: Server;
	username: string;
	message: string;
	timestamp?: Date;
	badge?: string;
	channelPrefix?: string;
}

export interface SpamDetectionResult {
	isSpam: boolean;
	reason?: "duplicate" | "rate_limit" | "flood" | "pattern";
	matchedCount?: number;
}
