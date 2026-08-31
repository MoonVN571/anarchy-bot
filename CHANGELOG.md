# Changelog

All notable changes to this project will be documented in this file.

---

## [6.3.0] - 2026-08-31

### Summary
Enhanced the live chat streaming pipeline with Discord Components V2 container batching, automatic spam message collapsing with `[xN]` badges, resilient HTTP 429 rate limit backoff, multi-tier fallback delivery (Containers -> Embeds -> Text), spam-filtered AutoMessage triggers, canvas rendering engine for status and coordinates visualization with avatar caching, and upgraded help command interface.

### Added
- **Container Batching & Rate Limiting Pipeline (`LiveChatManager.ts`)**:
  - Batched message dispatch aggregating up to 5 `ContainerBuilder` instances per Discord message using `flags: "IsComponentsV2"`.
  - 600ms debounce window and 800ms minimum inter-message delay to safely stay below Discord's 5 req / 5s rate limits.
  - Automatic Discord HTTP 429 detection and dynamic backoff using `retryAfter` with queue preservation.
  - Max queue safety limit (100 items) to prevent unbounded memory consumption during extended network delays.
- **Multi-Tier Fallback Delivery System**:
  - Tier 1: Single ContainerBuilder V2 retry.
  - Tier 2: Discord Rich Embeds (`embeds: [embed1, ... embedN]`, up to 10 embeds per message) via `MessageRenderer.renderEmbed`.
  - Tier 3: Formatted Plain Text Markdown fallback.
- **Spam & Duplicate Detection Engine (`spamDetector.ts`)**:
  - Signature-based duplicate detection per server across all chat types, death events, and system messages within a 15-second sliding window.
  - LiveChat queue duplicate collapsing: Merges identical pending messages into existing container items and increments `repeatCount`.
  - `[xN]` repetition badge (e.g. `[x2]`, `[x5]`) displayed in `MessageV2Renderer` and `MessageRenderer`.
- **Spam-Filtered AutoMessage Trigger**:
  - Excluded spam/duplicate in-game messages from triggering the `AutoMessageService.onServerMessage()` counter in `MessageStr.ts`, preventing tip spam attacks.
- **Canvas Status & Coordinate Visualization System**:
  - `AvatarCache.ts`: High-performance caching and retrieval for Minecraft player skin avatars and heads with `@napi-rs/canvas`.
  - `CoordinatesRenderer.ts`: Canvas renderer for bot position, world coordinates, dimension banners, and health/food indicators.
  - `ChunkRadarRenderer.ts`: Canvas map renderer visualizing local loaded chunks and entity positions.
- **Interactive Help Command**:
  - `HelpCommand.ts`: Rebuilt with Discord Components V2 containers detailing command parameters, usage examples, and permissions.

### Changed
- **Message Rendering Pipeline**:
  - Extended `MessageV2Renderer.ts` and `MessageRenderer.ts` with unified `renderContainer` and `renderEmbed` methods supporting `repeatCount`.
  - Added `renderPlayerChatEmbed` for seamless fallback delivery.
- **Bot Lifecycle**:
  - Connected `LiveChatManager.clear()` to `Minecraft.disconnect()` for clean shutdown and memory reclamation.

### Commits on 2026-08-31
- `686c6c4` - feat: implement batched live chat management with multi-tier delivery fallbacks and spam detection
- `72883fe` - feat: implement AvatarCache service and CoordinatesRenderer for bot status visualization
- `1905cb2` - feat: implement canvas rendering system with coordinate visualization, world backgrounds, and avatar caching
- `61362c6` - feat: implement message rendering utilities and services for discord v2 component support
- `f7766f9` - feat: implement message rendering and automation services including auto-messaging and Minecraft chat parsing utilities
- `ca740fa` - feat: add handlers for death pattern editing and classification modals
- `575c04a` - feat: initialize project structure with window handling, bot configuration, and service management
- `b887d5a` - feat: implement HelpCommand to display command lists and details with discord.js builders
- `ee52210` - feat: implement bot management infrastructure including command system, event handlers, and status reporting

---

## [6.2.0] - 2026-08-30

### Summary
Comprehensive architectural refactoring and feature implementation including a modular Discord interaction routing system, intelligent message classification with regex pattern learning, LiveChat pipeline with v2 UI rendering, MongoDB and Redis storage layers, and a full command management suite.

### Added
- **Dynamic Regex Learning Engine**: Introduced `deathRegexLearner` and `serverMessageMatcher` to dynamically generate and store regex patterns with dynamic token placeholders (`{victim}`, `{killer}`, `{weapon}`).
- **Interactive Message Classifier**: Added Discord modal and button handlers (`handleClassifyDeathModal`, `handleClassifySystem`, `handleClassifyDismiss`) allowing administrators to classify chat messages directly from Discord.
- **Select Menu Routing**: Added `selectMenuRouter` along with `handleCauseSelectMenu` and `handleScopeSelectMenu` to handle interactive dropdown selections.
- **Modular Interaction Routers**: Separated monolithic event logic into `buttonRouter`, `modalRouter`, and `selectMenuRouter`.
- **v2 Message Renderer**: Created `messageV2Renderer.ts` featuring modern dark UI embeds, player avatars, status badges, and interactive action buttons.
- **LiveChat Pipeline**: Created `LiveChatManager.ts` featuring message queuing, rate limiting, and batch message processing for Mineflayer chat.
- **Domain Services**:
  - `DeathParserService`: Parses and handles player death events with pattern matching.
  - `MessageClassifierService`: Classifies in-game messages (chat, deaths, whispers, system broadcasts).
  - `PlaytimeTracker`: Tracks player sessions and total playtime.
  - `QuoteService`: Generates and manages player chat quotes.
  - `StatsService`: Aggregates player statistics and leaderboards.
  - `SystemPatternService`: Manages system message rules and filters.
- **Command Suite**:
  - `CommandManager`: Discord slash commands handler (`/stats`, `/top`, `/kd`, `/online`, `/playtime`, `/quote`, `/help`).
  - `InGameCommandManager`: Minecraft chat commands handler (`!stats`, `!top`, `!kd`, `!online`, `!playtime`, `!quote`, `!help`).
- **Data Persistence & Cache Layer**:
  - MongoDB models: `PlayerModel`, `DeathModel`, `DeathPatternModel`, `SystemPatternModel`, `QuoteModel`, `MessageModel`.
  - `RedisManager`: Caching layer for fast pattern matching and session tracking.
- **Authentication**: Added `authHandler.ts` supporting both Microsoft and offline authentication modes.

### Changed
- **Death Classification Workflow**: Pre-filled modal inputs (victim, killer, weapon, scope) in `handleClassifyDeathModal.ts` for quicker manual pattern verification.
- **Event Handling**: Decoupled `interactionCreate.ts` and `MessageStr.ts` from monolithic blocks into modular services and handlers.
- **Bot Lifecycle**: Refactored `Minecraft.ts` and `MinecraftBotManager.ts` for improved lifecycle management, auto-reconnect, and error handling.
- **Configuration Structure**: Reorganized config into `src/config/appConfig.ts` with strict TypeScript typings.

### Commits on 2026-08-30
- `92a0399` - feat: add handleClassifyDeathModal to parse death messages and display configuration modal
- `29598ce` - feat: implement comprehensive bot framework including command management, message parsing, death verification, and interaction handling
- `91b782e` - feat: implement core architecture and message classification system
- `05b6112` - feat: implement core infrastructure including Redis caching, MongoDB data models, and specialized services for death tracking and message parsing
- `f1f8248` - feat: implement mineflayer livechat management system with rate limiting and discord integration
- `e24b813` - feat: implement discord controller, mineflayer event handlers, and core bot structures for message processing and authentication.
