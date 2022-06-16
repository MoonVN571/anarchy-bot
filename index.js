const { Client, Collection, Intents }= require('discord.js');
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

module.exports.discord = client;

client.commands = new Collection();


// Load env
require('dotenv').config();

// MONGO
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_STRING).then(() => {
    console.log("Đã kết nối đến MongoDB!");
});



// LOAD event & command
require('./handler/index');

client.login(process.env.TOKEN, console.error);

