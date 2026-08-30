# Changelog

All notable changes to this project will be documented in this file.

---

## [2026-08-30] - 6 Commits

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
