# Anarchy Bot

<p align="center">
  <strong>Advanced Bidirectional Discord & Minecraft Integration Bot for Anarchy Servers</strong><br>
  <em>Built for high performance, dynamic message learning, comprehensive player statistics, and real-time synchronization.</em>
</p>

---

## Overview

**Anarchy Bot** is a feature-rich, high-performance integration bot engineered specifically for Minecraft anarchy servers (supporting 2Y2C, AnarchyVN, MCVui, ViAnarchy, Vanilla, and custom servers). 

It features an intelligent bidirectional **LiveChat bridge**, dynamic **Death Regex Learner** with automated pattern extraction, a **5-tier System Message Classifier**, comprehensive **Player Analytics** (K/D, Killstreaks, Playtime, Quotes, Sessions), **Redis-powered caching & leaderboards**, and a modular **RESTful API backend**.

---

## Key Features

### 1. Smart LiveChat Bridge (Discord ⇄ Minecraft)
- **Bidirectional Sync**: Real-time communication between Discord channels and Minecraft servers.
- **Visual Color-Coded Embeds**:
  - `Death / Kill`: Crimson Red (`0xDB2D2D`)
  - `Server Broadcast`: Sky Blue (`0x3498DB`)
  - `Whisper / Direct Message`: Magenta (`0xFD00FF`)
  - `Player Join [+]`: Emerald Green (`0x2ECC71`)
  - `Player Quit [-]`: Carrot Orange (`0xE67E22`)
  - `Queue Position`: Gold Yellow (`0xF1C40F`)
  - `Advancement / Achievement`: Purple (`0x9B59B6`)
  - `Standard Player Chat`: Slate Grey (`0x979797`)
  - `Greentext (>...)`: Vibrant Green (`0x2EA711`)
- **Rank & Markdown Formatting**: Retains player ranks and prefixes while safely escaping Discord Markdown syntax.

### 2. Death Regex Learner & Conflict Resolution
- **Automated Regex Extraction**: Automatically analyzes unrecognized death messages and compiles named-capture regex patterns (`(?<victim>...)`, `(?<killer>...)`, `(?<mob>...)`).
- **Bilingual Minecraft Mob Dictionary**: Comprehensive mob database supporting both English identifiers and Vietnamese server translations.
- **Player-Mob Name Conflict Detection**: Detects ambiguous entities (e.g. online players sharing names with mobs like `Zombie` or `Alex`) and prompts administrators on Discord to disambiguate PvP vs. Mob deaths.
- **Manual Corrections & Retroactive Recalculations**:
  - Administrators can edit regex patterns, victim, killer, and cause directly via Discord Modals.
  - Automatically updates database records and recalculates K/D stats and killstreaks retroactively.
- **Instant Hot-Reload**: Newly approved patterns are cached in Redis and RAM immediately without requiring a bot restart.

### 3. 5-Tier Message Classification System
- **Tier 1**: Player Chat & Greentext.
- **Tier 2**: Join / Quit Events.
- **Tier 3**: Known Death Messages (Fast compiled matching).
- **Tier 4**: Known System / Server Broadcasts.
- **Tier 5**: Unclassified Non-Player Prompter (Sends an interactive review card to the verification channel).

### 4. Player Analytics & Real-Time Leaderboards
- **Session Tracking**: Tracks `firstSeen`, `joinDate` (virtual alias), `lastSeen`, `lastJoin`, `lastQuit`, `joinCount`, and `leaveCount`.
- **Combat Metrics**: Accurately tracks `kills`, `deaths`, `kdRatio`, `currentKillstreak`, and `highestKillstreak`.
- **Quote Recording**: Captures memorable player quotes into MongoDB.
- **Redis Sorted Sets Leaderboards**: High-speed real-time rankings for Kills, Deaths, Playtime, and Message Counts.

### 5. Modular RESTful Backend API
- Built with Express.js to expose bot health, server status, player stats, and Discord guild data.
- Configurable toggle via `ENABLE_BACKEND=true/false` in `.env`.
- Secured via Header API Key authentication (`X-API-Key`).

---

## Environment Configuration (`.env`)

Create a `.env` file in the root directory based on `.env.example`:

```env
# ==========================================
# 1. DISCORD BOT CONFIGURATION
# ==========================================
TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
GUILD_ID=your_discord_guild_id_here
DEATH_VERIFY_CHANNEL_ID=your_channel_id_for_death_and_system_verification

# ==========================================
# 2. MINECRAFT BOT CONFIGURATION
# ==========================================
BOT_NAME=your_minecraft_username
PIN=1234
AUTHME=your_minecraft_password
PREFIX=!

# ==========================================
# 3. DATABASE & REDIS CONFIGURATION
# ==========================================
MONGO_URI=mongodb://127.0.0.1:27017/anarchy-bot
REDIS_URL=redis://127.0.0.1:6379
REDIS_PREFIX=anarchy

# ==========================================
# 4. SYSTEM & BACKEND API CONFIGURATION
# ==========================================
NODE_ENV=development
DEBUG=true
ENABLE_BACKEND=false
PORT=8181
API_KEY=your_secure_api_key_here
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.x or v20.x+
- **MongoDB**: v5.0+ or MongoDB Atlas
- **Redis**: v6.0+

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/anarchy-bot.git
   cd anarchy-bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run the bot**:
   - **Development mode** (with hot reload):
     ```bash
     npm run dev
     ```
   - **Production build**:
     ```bash
     npm run build
     npm start
     ```

---

## Project Structure

```
├── src/
│   ├── backend/              # Express REST API server (routes, middleware, controllers)
│   ├── database/             # Mongoose Models (Player, Death, DeathPattern, SystemPattern...)
│   ├── events/
│   │   ├── client/           # Discord Client Events (ready, interactionCreate modal/button handler...)
│   │   └── mineflayer/       # Mineflayer Events (Chat, MessageStr, Spawn, End, Error...)
│   ├── redis/                # RedisManager & Redis connection client
│   ├── services/             # Core Services (DeathParser, SystemPattern, Stats, Playtime...)
│   ├── structures/           # Discord & Minecraft bot wrappers, Logger, LiveChatManager
│   ├── typings/              # TypeScript interfaces and type declarations
│   ├── utils/                # ChatParser, DeathRegexLearner, MinecraftMobs, seed patterns
│   └── index.ts              # Main application entry point
├── .env.example              # Documented environment variables template
├── package.json
└── tsconfig.json
```

---

## License

This project is licensed under the **ISC License**.
Feel free to open an Issue or submit a Pull Request if you'd like to contribute.