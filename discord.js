const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { readdirSync } =require('fs');
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

client.once('ready', () => {
    console.log("Đã sẵn sàng hoạt động!");

    require('./bot').createBot();
});

client.commands = new Collection();
readdirSync('./commands').forEach(cmdName =>
    client.commands.set(cmdName.split(".")[0], require('./commands/' + cmdName))
);

client.on('error', console.error);
client.login(process.env.TOKEN, console.error);
