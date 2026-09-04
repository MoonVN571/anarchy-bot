const fs = require("fs");
const path = require("path");

console.log("======================================================");
console.log("[Verify] Running Comprehensive Architecture & No-Emoji Verification");
console.log("======================================================\n");

let allPassed = true;

// 1. Test Command Registration
try {
	const { commandManager } = require("../dist/commands");
	const commands = commandManager.getAllCommands();
	console.log(`[Commands] Total Registered Commands: ${commands.length}`);

	const expectedCommands = [
		"highway", "goto", "stop", "follow", "coords", "totem",
		"botstatus",
		"help", "discord", "joindate", "seen", "stats", "kill", "ping", "tps",
		"kd", "playtime", "top", "quote", "online", "firstmessage", "lastmessage", "tablist"
	];

	let missing = [];
	for (const expected of expectedCommands) {
		const cmd = commandManager.getCommand(expected);
		if (!cmd) {
			missing.push(expected);
		}
	}

	if (missing.length === 0 && commands.length === expectedCommands.length) {
		console.log(`✅ [PASS] All ${expectedCommands.length} commands successfully registered!`);
	} else {
		console.error(`❌ [FAIL] Missing or mismatch commands: ${missing.join(", ")}`);
		allPassed = false;
	}
} catch (err) {
	console.error(`❌ [FAIL] Error loading CommandManager:`, err);
	allPassed = false;
}

// 2. Test No-Emoji Rule across all files in src/commands/
console.log("\n[No-Emoji Check] Scanning all command files for text emojis...");

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

function scanDirForEmojis(dir) {
	const files = fs.readdirSync(dir);
	let foundEmojis = [];

	for (const file of files) {
		const fullPath = path.join(dir, file);
		const stat = fs.statSync(fullPath);

		if (stat.isDirectory()) {
			foundEmojis.push(...scanDirForEmojis(fullPath));
		} else if (file.endsWith(".ts")) {
			const content = fs.readFileSync(fullPath, "utf-8");
			const lines = content.split("\n");
			lines.forEach((line, idx) => {
				const match = line.match(emojiRegex);
				if (match) {
					foundEmojis.push({
						file: path.relative(path.join(__dirname, ".."), fullPath),
						line: idx + 1,
						emoji: match[0],
						text: line.trim()
					});
				}
			});
		}
	}

	return foundEmojis;
}

const commandsPath = path.join(__dirname, "../src/commands");
const emojiViolations = scanDirForEmojis(commandsPath);

if (emojiViolations.length === 0) {
	console.log("✅ [PASS] 100% of command files are clean! ZERO text emojis detected.");
} else {
	console.error(`❌ [FAIL] Found ${emojiViolations.length} emoji violations:`);
	emojiViolations.forEach(v => {
		console.error(`   - ${v.file}:${v.line} [${v.emoji}] "${v.text}"`);
	});
	allPassed = false;
}

// 3. Test Event Classes
console.log("\n[Events] Checking Discord and Mineflayer Event Registries...");
try {
	const { discordEventClasses } = require("../dist/events/discord");
	const { mineflayerEventClasses } = require("../dist/events/mineflayer");

	console.log(`- Discord Events: ${discordEventClasses.length} registered`);
	console.log(`- Mineflayer Events: ${mineflayerEventClasses.length} registered`);

	if (discordEventClasses.length >= 2 && mineflayerEventClasses.length >= 6) {
		console.log("✅ [PASS] All Event classes loaded successfully!");
	} else {
		console.error("❌ [FAIL] Incomplete event registration!");
		allPassed = false;
	}
} catch (err) {
	console.error("❌ [FAIL] Error verifying events:", err);
	allPassed = false;
}

console.log("\n======================================================");
if (allPassed) {
	console.log("🎉 ALL ARCHITECTURE & COMMAND VERIFICATION CHECKS PASSED!");
} else {
	console.log("❌ SOME VERIFICATION CHECKS FAILED!");
	process.exit(1);
}
console.log("======================================================");
