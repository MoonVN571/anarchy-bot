const client = require('./index').discord;
const m = require('mineflayer');
const { Collection } = require('discord.js');
const { readdirSync } = require('fs');
require('dotenv').config();

let config = {
    botName: 'mo0nbot2',
    dev: false,
    minecraftPrefix: '!'
}

let chatChannel = '986599157068361734';
if(config.dev) chatChannel = '987204059838709780';

let logChannel = '986601542981410816';
if(config.dev) logChannel = '987204075164692551';

let joinChannel = '986601627588894720';
if(config.dev) joinChannel = '987204116839284756';

let serverChnanel = '986807303565086781';
if(config.dev) serverChnanel = '987204092113879040';


let cmdChannel = '987889094845689916';
if(config.dev) cmdChannel = '990104136018182154';

let channel = {
    chat: chatChannel,
    log: logChannel,
    join: joinChannel,
    server: serverChnanel
}

function createBot() {
    const bot = m.createBot({
        host: process.env.IP,
        port: 25565,
        username: config.botName,
        version: '1.16.5'
    });

    bot.commands = new Collection();

    readdirSync('./igCommands').forEach(cmdName => {
        bot.commands.set(cmdName.split(".")[0], require('./igCommands/'+cmdName));
    });

    bot.prefix = config.minecraftPrefix;
    bot.chatChannel = chatChannel;
    bot.client = client;
    bot.adminName = ['MoonX', 'MoonVN'];
    bot.config = config;

    bot.notFoundPlayers = 'Không tìm thấy người chơi này.';

    bot.mainServer = false;
    bot.exited = false;
    bot.logged = false;
    bot.uptime = 0;
    bot.queueTime = 0;

    // Join Leave
    bot.countPlayers = 0;


    readdirSync('./igEvents').forEach(eventName => {
        let event = require('./igEvents/'+eventName);
        setTimeout(() => {
            if (event.other && event.once) {
                bot._client.once(event.name, (...args) => event.execute(bot, ...args));
            } else if (event.other && !event.once) {
                bot._client.on(event.name, (...args) => event.execute(bot, ...args));
            } else {
                if (event.once) {
                    bot.once(event.name, (...args) => event.execute(bot, ...args));
                } else {
                    bot.on(event.name, (...args) => event.execute(bot, ...args));
                }
            }
        }, event.timeout);
    });

    client.on('messageCreate', message => {
        if(bot.exited||message.channel.type == 'DM'||!message.guild||!message.channel.isText()||message.author.bot) return;
        if(message.channel.id==cmdChannel) bot.chat(message.content);
        if(message.channel.id == chatChannel) {
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
