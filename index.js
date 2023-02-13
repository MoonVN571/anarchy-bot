const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { readdirSync } = require('fs');
const mongoose = require('mongoose');
const express = require('express');
const app = express();
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
client.dev = false;
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
// Express
app.get('/', (req, res) => {
    res.send('Hello World!');
})
app.listen(process.env.PORT || 3000, () => console.log('Listening'));
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
