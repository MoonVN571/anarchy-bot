import { Server } from "../minecraft/enums";

export interface ParsedDeathEvent {
	server: Server;
	victim: string;
	killer?: string;
	weapon?: string;
	rawMessage: string;
	matchedPattern?: string;
	timestamp: Date;
}

export interface PlayerStatsSummary {
	server: Server;
	username: string;
	kills: number;
	deaths: number;
	kdRatio: number;
	playtime: number; // in milliseconds or seconds
	firstSeen: Date;
	lastSeen: Date;
	isOnline: boolean;
}

export interface LearnedPatternResult {
	regex: string;
	type: "death" | "system";
	sampleCount: number;
	extractedGroups: string[];
}
