const { Client, Collection, Intents } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

module.exports = { client };

client.commands = new Collection();
client.config = require('./index').config;

require('./handler/index');

client.on('error', console.error);
client.login(process.env.TOKEN, console.error);
