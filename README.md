# Anarchy Bot

A versatile Discord and Minecraft integration bot designed specifically for anarchy servers. Provides real-time chat bridging, automated interactions, and API access.

## Features

### Minecraft Integration
- **Live Chat Bridge**: Bidirectional chat between Discord and Minecraft servers
- **Smart Message Formatting**: Preserves chat formatting, ranks, and special messages
- **Auto-Authentication**: Handles login/register commands automatically
- **Rate Limiting**: Intelligent rate limiting to prevent disconnects
- **Auto-Reconnect**: Automatically reconnects after disconnections
- **Multiple Server Support**: Compatible with various anarchy servers (anarchy.vn)
- **Auto Messages**: Configurable automated messages on a timer

### Discord Features
- **Livechat Channels**: Dedicated channels for each server's chat
- **Channel Topic Updates**: Live server statistics in the channel topic
- **Message Reactions**: Confirms message delivery with reactions
- **Message Filtering**: Prevents command execution in chat

### API Features
- **RESTful API**: Access bot functionality through HTTP endpoints
- **Server Status**: Check health and status of the bot
- **Discord Integration**: API access to Discord guild information
- **Authentication**: Secure API access via API key
- **Rate Limiting**: Protects against API abuse

## Setup

Follow these steps to set up the bot:

1. **Prerequisites**:
   - Node.js (v20.x or higher)
   - TypeScript (for development)

2. **Installation**:
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/anarchy-bot.git
   cd anarchy-bot
   
   # Install dependencies
   npm install
   ```

3. **Configuration**:
   - Copy `.env.example` to `.env` and configure the following:
        ```
        TOKEN=your_discord_bot_token
        BOT_NAME=your_minecraft_bot_name
        PIN=1234
        AUTHME=your_minecraft_password
        PORT=8181
        API_KEY=your_api_key
        NODE_ENV=development/production
        ```

4. **Running the Bot**:
   - Development mode:
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm run build
     npm start
     ```

5. **API Access**:
   - API will be available at `http://localhost:8181/api`
   - Use your API key in the X-API-Key header for authenticated requests

## Commands (Comming soon)

- Use `!command` format in Discord to interact with the bot
- Minecraft chat from Discord will be sent with a formatted prefix: `[Username] Message`

## File Structure

```
├── src/
│   ├── backend/          # API server implementation
│   ├── events/           # Event handlers for Discord and Minecraft
│   ├── structures/       # Core bot structures
│   ├── typings/          # TypeScript type definitions
│   ├── config.json       # Bot configuration
│   └── index.ts          # Entry point
├── .env.example          # Example environment variables
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Logs

Logs are stored in the `logs` directory with daily rotation.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

ISC