const { Client, GatewayIntentBits } = require('discord.js');
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
client.config = require('./index').config;

client.once('ready', () => {
    console.log("Đã sẵn sàng hoạt động!");

    require('./bot').createBot();
});

client.on('error', console.error);
client.login(process.env.TOKEN, console.error);
