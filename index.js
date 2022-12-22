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
client.on('error', console.error);
