import { DeathCause } from "../src/database/models/DeathModel";
import { defaultDeathPatterns } from "../src/utils/analytics/defaultDeathPatterns";
import { DeathParserService } from "../src/services/analytics/DeathParserService";

interface TestCase {
	message: string;
	expected: {
		victim: string;
		killer?: string | null;
		mob?: string | null;
		weapon?: string | null;
		cause: DeathCause;
	};
}

const testCases: TestCase[] = [
	// --- 1. Vietnamese PvP Tests ---
	{
		message: "Steve đã bị Alex giết bằng [Diamond Sword]",
		expected: { victim: "Steve", killer: "Alex", weapon: "Diamond Sword", cause: DeathCause.PVP },
	},
	{
		message: "Player_123 đã bị Loaconto tiễn lên bảng đếm số bằng Kiếm Netherite",
		expected: { victim: "Player_123", killer: "Loaconto", weapon: "Kiếm Netherite", cause: DeathCause.PVP },
	},
	{
		message: "Noob99 đã bị ProGamer hạ gục bằng [Gậy Phù Thủy]",
		expected: { victim: "Noob99", killer: "ProGamer", weapon: "Gậy Phù Thủy", cause: DeathCause.PVP },
	},
	{
		message: "Steve đã bị đánh bại dễ dàng bởi Alex sử dụng [Bow]",
		expected: { victim: "Steve", killer: "Alex", weapon: "Bow", cause: DeathCause.PVP },
	},
	{
		message: "Steve đã bị đánh bại bởi Alex",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},
	{
		message: "Bob đã bị Alice cho ăn đấm bằng Tay Không",
		expected: { victim: "Bob", killer: "Alice", weapon: "Tay Không", cause: DeathCause.PVP },
	},
	{
		message: "VictimPlayer đã bị SniperGuy bắn hạ bằng Cung Thần",
		expected: { victim: "VictimPlayer", killer: "SniperGuy", weapon: "Cung Thần", cause: DeathCause.PVP },
	},
	{
		message: "PlayerOne đã bị nổ banh xác bởi BomberMan",
		expected: { victim: "PlayerOne", killer: "BomberMan", cause: DeathCause.PVP },
	},
	{
		message: "Steve đã bị Alex đẩy xuống vực",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},
	{
		message: "Steve đã bị Alex đẩy xuống hư không",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},
	{
		message: "Steve rơi vào hư không khi đang chiến đấu với Alex",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},
	{
		message: "Steve đã bơi trong dung nham khi đang trốn chạy Alex",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},
	{
		message: "Steve bị thiêu cháy khi đang chiến đấu với Alex",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},

	// --- 2. Vietnamese Mob Tests ---
	{
		message: "Steve đã bị Zombie ăn sống",
		expected: { victim: "Steve", mob: "Zombie", cause: DeathCause.MOB },
	},
	{
		message: "Steve đã bị Wither Skeleton giết bằng Kiếm Đá",
		expected: { victim: "Steve", mob: "Wither Skeleton", weapon: "Kiếm Đá", cause: DeathCause.MOB },
	},
	{
		message: "Steve đã bị Ender Dragon cắn chết",
		expected: { victim: "Steve", mob: "Ender Dragon", cause: DeathCause.MOB },
	},
	{
		message: "Steve đã bị nổ banh xác bởi Creeper",
		expected: { victim: "Steve", mob: "Creeper", cause: DeathCause.MOB },
	},

	// --- 3. Vietnamese Fall Tests ---
	{
		message: "Steve nghĩ rằng họ có thể bay... nhưng họ không thể",
		expected: { victim: "Steve", cause: DeathCause.FALL },
	},
	{
		message: "Steve đã quên mang dù nhảy",
		expected: { victim: "Steve", cause: DeathCause.FALL },
	},
	{
		message: "Steve quyết định thử nghiệm trọng lực và thất bại",
		expected: { victim: "Steve", cause: DeathCause.FALL },
	},
	{
		message: "Steve đã rơi từ trên cao xuống",
		expected: { victim: "Steve", cause: DeathCause.FALL },
	},
	{
		message: "Steve đã va vào mặt đất quá mạnh",
		expected: { victim: "Steve", cause: DeathCause.FALL },
	},

	// --- 4. Vietnamese Void / Lava / Fire / Drown / Explosion / Suicide Tests ---
	{
		message: "Steve đã rơi vào hư không",
		expected: { victim: "Steve", cause: DeathCause.VOID },
	},
	{
		message: "Steve đã rơi khỏi thế giới",
		expected: { victim: "Steve", cause: DeathCause.VOID },
	},
	{
		message: "Steve đã thử bơi trong dung nham",
		expected: { victim: "Steve", cause: DeathCause.LAVA },
	},
	{
		message: "Steve đã bị thiêu cháy",
		expected: { victim: "Steve", cause: DeathCause.FIRE },
	},
	{
		message: "Steve đã cháy thành tro",
		expected: { victim: "Steve", cause: DeathCause.FIRE },
	},
	{
		message: "Steve đã bị chết đuối",
		expected: { victim: "Steve", cause: DeathCause.DROWN },
	},
	{
		message: "Steve đã bị ngạt thở dưới nước",
		expected: { victim: "Steve", cause: DeathCause.DROWN },
	},
	{
		message: "Steve đã nổ tung",
		expected: { victim: "Steve", cause: DeathCause.EXPLOSION },
	},
	{
		message: "Steve đã bị nổ tung bởi pha lê",
		expected: { victim: "Steve", cause: DeathCause.EXPLOSION },
	},
	{
		message: "Steve đã tự sát",
		expected: { victim: "Steve", cause: DeathCause.SUICIDE },
	},
	{
		message: "Steve đã tự kết liễu đời mình",
		expected: { victim: "Steve", cause: DeathCause.SUICIDE },
	},
	{
		message: "Steve đã bị trúng độc",
		expected: { victim: "Steve", cause: DeathCause.MAGIC },
	},
	{
		message: "Steve đã bị héo mòn bởi Wither",
		expected: { victim: "Steve", cause: DeathCause.MAGIC },
	},
	{
		message: "Steve đã bị ngạt thở trong tường",
		expected: { victim: "Steve", cause: DeathCause.UNKNOWN },
	},
	{
		message: "Steve đã chết",
		expected: { victim: "Steve", cause: DeathCause.UNKNOWN },
	},

	// --- 5. English / Vanilla Minecraft Tests ---
	{
		message: "Steve was slain by Alex using [Diamond Sword]",
		expected: { victim: "Steve", killer: "Alex", weapon: "Diamond Sword", cause: DeathCause.PVP },
	},
	{
		message: "Steve was shot by Alex using [Bow]",
		expected: { victim: "Steve", killer: "Alex", weapon: "Bow", cause: DeathCause.PVP },
	},
	{
		message: "Steve was blown up by Alex using [TNT]",
		expected: { victim: "Steve", killer: "Alex", weapon: "TNT", cause: DeathCause.PVP },
	},
	{
		message: "Steve was killed by Alex using [Axe]",
		expected: { victim: "Steve", killer: "Alex", weapon: "Axe", cause: DeathCause.PVP },
	},
	{
		message: "Steve was skewered by Alex using [Trident]",
		expected: { victim: "Steve", killer: "Alex", weapon: "Trident", cause: DeathCause.PVP },
	},
	{
		message: "Steve got finished off by Alex using [Sharp Stick]",
		expected: { victim: "Steve", killer: "Alex", weapon: "Sharp Stick", cause: DeathCause.PVP },
	},
	{
		message: "Steve fell into the void while fighting Alex",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},
	{
		message: "Steve was knocked into the void by Alex",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},
	{
		message: "Steve was doomed to fall by Alex",
		expected: { victim: "Steve", killer: "Alex", cause: DeathCause.PVP },
	},
	{
		message: "Steve was slain by Zombie",
		expected: { victim: "Steve", mob: "Zombie", cause: DeathCause.MOB },
	},
	{
		message: "Steve was blown up by Creeper",
		expected: { victim: "Steve", mob: "Creeper", cause: DeathCause.MOB },
	},
	{
		message: "Steve hit the ground too hard",
		expected: { victim: "Steve", cause: DeathCause.FALL },
	},
	{
		message: "Steve fell from a high place",
		expected: { victim: "Steve", cause: DeathCause.FALL },
	},
	{
		message: "Steve fell into the void",
		expected: { victim: "Steve", cause: DeathCause.VOID },
	},
	{
		message: "Steve fell out of the world",
		expected: { victim: "Steve", cause: DeathCause.VOID },
	},
	{
		message: "Steve drowned",
		expected: { victim: "Steve", cause: DeathCause.DROWN },
	},
	{
		message: "Steve tried to swim in lava",
		expected: { victim: "Steve", cause: DeathCause.LAVA },
	},
	{
		message: "Steve burned to death",
		expected: { victim: "Steve", cause: DeathCause.FIRE },
	},
	{
		message: "Steve blew up",
		expected: { victim: "Steve", cause: DeathCause.EXPLOSION },
	},
	{
		message: "Steve was killed by magic",
		expected: { victim: "Steve", cause: DeathCause.MAGIC },
	},
	{
		message: "Steve withered away",
		expected: { victim: "Steve", cause: DeathCause.MAGIC },
	},
	{
		message: "Steve suffocated in a wall",
		expected: { victim: "Steve", cause: DeathCause.UNKNOWN },
	},
	{
		message: "Steve died",
		expected: { victim: "Steve", cause: DeathCause.UNKNOWN },
	},
];

async function runVerification() {
	console.log(`\n======================================================`);
	console.log(`[Verify] Testing ${testCases.length} Death Message Regex Test Cases`);
	console.log(`[Verify] Total Default Death Patterns in Code: ${defaultDeathPatterns.length}`);
	console.log(`======================================================\n`);

	let passed = 0;
	let failed = 0;

	for (let i = 0; i < testCases.length; i++) {
		const tc = testCases[i];
		const result = DeathParserService.extractDeathInfoSync("global", tc.message);

		if (!result) {
			console.error(`❌ [FAIL ${i + 1}/${testCases.length}] Unmatched message: "${tc.message}"`);
			failed++;
			continue;
		}

		let ok = true;
		const errors: string[] = [];

		if (result.victim !== tc.expected.victim) {
			ok = false;
			errors.push(`Victim mismatch: expected "${tc.expected.victim}", got "${result.victim}"`);
		}

		if (tc.expected.killer !== undefined && (result.killer || null) !== (tc.expected.killer || null)) {
			ok = false;
			errors.push(`Killer mismatch: expected "${tc.expected.killer}", got "${result.killer}"`);
		}

		if (tc.expected.mob !== undefined && (result.mob || null) !== (tc.expected.mob || null)) {
			ok = false;
			errors.push(`Mob mismatch: expected "${tc.expected.mob}", got "${result.mob}"`);
		}

		if (tc.expected.weapon !== undefined && (result.weapon || null) !== (tc.expected.weapon || null)) {
			ok = false;
			errors.push(`Weapon mismatch: expected "${tc.expected.weapon}", got "${result.weapon}"`);
		}

		if (result.cause !== tc.expected.cause) {
			ok = false;
			errors.push(`Cause mismatch: expected "${tc.expected.cause}", got "${result.cause}"`);
		}

		if (ok) {
			console.log(`✅ [PASS ${i + 1}/${testCases.length}] "${tc.message}" -> Cause: ${result.cause}, Victim: ${result.victim}${result.killer ? `, Killer: ${result.killer}` : ""}${result.mob ? `, Mob: ${result.mob}` : ""}${result.weapon ? `, Weapon: ${result.weapon}` : ""}`);
			passed++;
		} else {
			console.error(`❌ [FAIL ${i + 1}/${testCases.length}] "${tc.message}"\n   ${errors.join("\n   ")}`);
			failed++;
		}
	}

	console.log(`\n======================================================`);
	console.log(`[Summary] Total: ${testCases.length} | Passed: ${passed} | Failed: ${failed}`);
	console.log(`[Status] ${failed === 0 ? "🎉 ALL TESTS PASSED SUCCESSFULLY! (100%)" : "⚠️ SOME TESTS FAILED!"}`);
	console.log(`======================================================\n`);

	if (failed > 0) {
		process.exit(1);
	}
}

runVerification().catch(console.error);
