const { Client, Collection, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const { readdirSync } = require('fs');
require('dotenv').config();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});
module.exports = client;
client.config = require('./config.json');
client.commands = new Collection();
client.once('ready', () => {
    console.log("Đã sẵn sàng hoạt động!");
    const { setStatus } = require('./functions/botFunc');
    setStatus('idle', 'Listening', 'Chờ kết nối.');
    require('./bot').createBot();
});
readdirSync('./commands').forEach(cmdName => {
    client.commands.set(cmdName.split(".")[0], require('./commands/' + cmdName))
});
mongoose.connect(process.env.MONGO_STRING).then(() => {
    console.log("Đã kết nối đến MongoDB!");
    client.login(process.env.TOKEN, console.error);
});
client.on('error', console.error);