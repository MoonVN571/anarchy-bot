const { Client, Collection, Intents }= require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

const config = {
    prefix: '$',
    dev: false
};

module.exports = { client, config };

client.commands = new Collection();
client.config = config;

mongoose.connect(process.env.MONGO_STRING).then(() => {
    console.log("Đã kết nối đến MongoDB!");
});

require('./handler/index');
require('./process');

client.login(process.env.TOKEN, console.error);

