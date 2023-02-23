const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { readdirSync } = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
module.exports = {
    discord: client
};
client.dev = process.env.NODE_ENV == 'development';
const { log } = require('./functions/utils');
// Events
client.once('ready', () => {
    log(`${client.user.tag} is online!`);
    const Game = require('./games');
    const bot = new Game();
    bot.create();
});
client.rest.on('rateLimited', (info, data) => {
    if (client.dev) console.log(info, data);
});
// Command handler
client.commands = new Collection();
readdirSync('./commands').forEach(cmdName =>
    client.commands.set(cmdName.split(".")[0], require('./commands/' + cmdName))
);
// MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_STRING, {}).then(() => {
    console.log("Connected to MongoDB!");
    client.login(process.env.TOKEN, console.error);
});
// Catch errors
process.on('uncaughtException', (error) => {
    console.log(error);
    let message = error.stack;
    let msgObj = {};
    if (message.length > 2000) {
        msgObj['files'] = [{
            name: new Date().toLocaleString() + ".txt", attachment: Buffer.from(message)
        }];
    } else msgObj['content'] = `\`\`\`${message}\`\`\``;
    if (client.dev) return process.exit();
    client.channels.cache.get(require('./setting').channel.error)?.send(msgObj);
});
client.on('error', console.error);
