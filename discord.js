const { Client, Collection, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

module.exports = { client };

client.commands = new Collection();
client.config = require('./index').config;

require('./handler/index');

client.on('error', console.error);
client.login(process.env.TOKEN, console.error);
