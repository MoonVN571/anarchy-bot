const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { readdirSync } = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});
module.exports = {
    discord: client
};
client.once('ready', () => {
    console.log(client.user.tag + ' is online!');
    require('./bot').callBot();
});
client.rest.on('rateLimited', (info, data) => {
    console.log(info, data);
})
client.dev = false;
client.commands = new Collection();
readdirSync('./commands').forEach(cmdName =>
    client.commands.set(cmdName.split(".")[0], require('./commands/' + cmdName))
);
mongoose.connect(process.env.MONGO_STRING).then(() => {
    console.log("Connected to MongoDB!");
    client.login(process.env.TOKEN, console.error);
    require('./api');
});
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
    client.channels.cache.get(require('./setting').channel.error).send(msgObj);
});
client.on('error', console.error);
