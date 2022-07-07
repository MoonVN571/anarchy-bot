const main = require('./index');
const m = require('mineflayer');
const { Collection } = require('discord.js');
const { readdirSync } = require('fs');
require('dotenv').config();

let config = {
    botName: main.config.dev ? "mo0nbot4" : "mo0nbot3",
    dev: main.config.dev,
    minecraftPrefix: main.config.dev ? "!!" : "!"
}

let channel = {
    chat: config.dev ? "987204059838709780" : "986599157068361734",
    log: config.dev ? "987204075164692551" : "986601542981410816",
    join: config.dev ? "987204116839284756" : "987204116839284756",
    server: config.dev ? "987204092113879040" : "986807303565086781",
    commands: config.dev ? "990104136018182154" : "987889094845689916"
}

function createBot() {
    const bot = m.createBot({
        host: process.env.IP,
        port: 25565,
        username: config.botName,
        version: '1.16.5'
    });

    // Chạm được nè
    bot.adminName = ['MoonX', 'MoonVN', bot.username];
    bot.notFoundPlayers = 'Không tìm thấy người chơi này.';

    // đừng đụng zô
    bot.client = main.client;
    bot.config = config;

    bot.mainServer = false;
    bot.exited = false;
    bot.logged = false;
    bot.nextCheckTab = true;
    bot.uptime = 0;
    bot.queueTime = 0;

    // Join Leave
    bot.countPlayers = 0;

    bot.commands = new Collection();
    readdirSync('./igCommands').forEach(cmdName => {
        bot.commands.set(cmdName.split(".")[0], require('./igCommands/'+cmdName));
    });

    readdirSync('./igEvents').forEach(eventName => {
        let event = require('./igEvents/'+eventName);
        if (event.other && event.once) {
            bot._client.once(event.name, (...args) => event.execute(bot, ...args));
        } else if (event.other && !event.once) {
            bot._client.on(event.name, (...args) => event.execute(bot, ...args));
        } else {
            if (event.once) {
                bot.once(event.name, (...args) => event.execute(bot, ...args));
            } else bot.on(event.name, (...args) => event.execute(bot, ...args));
        }
    });

    main.client.on('messageCreate', message => {
        if(bot.exited||message.channel.type == 'DM'||!message.guild||!message.channel.isText()||message.author.bot) return;
        if(message.channel.id==channel.commands) bot.chat(message.content);
        if(message.channel.id == channel.chat) {
            let content = message.content.trim().split(/ +/g);
            
            content = content.join(" ") + ".";
            if(!content.endsWith(".")) content = content.join(" ");

            content = content.charAt(0).toUpperCase() + content.slice(1);

            if(message.author.username.includes("§") || content.includes("§")) return;
            message.react('<a:1505_yes:797268802680258590>');
            if(content !== "") bot.chat(`[${message.author.tag}] ${content}`);
        }
    });
}

module.exports = { createBot, config, channel };
