const client = require('../index').discord;
const { getDorHMS } = require('./utils');
const kd = require('../db/stats');
const globalChnanel = require('../bot').channel;

let livechat_color = {
    default: 0x979797,
    highlight: 0x2EA711,
    dead: 0xDB2D2D,
    system: 0xb60000,
    whisper: 0xFD00FF,
    chatbot: 0x4983e7
}

let botlog_color = {
    join_log: 0x15ff00,
    queue_log: 0xeeee00,
    disconnect_log: 0xF71319
}

let messageList = [];
let serverMessageList = [];
let joinList = [];

async function sendGlobalChat(bot, content, username, message) {
    let color = livechat_color.default;

    let chat = `**<${username}>** ${message}`;

    if(message?.startsWith(">")) color = livechat_color.highlight;

    if(!username) {
        color = livechat_color.system;
        chat = content;
    }

    if(!content) return;

    if(fetchData(content)) color = livechat_color.dead;

    if(username == bot.config.botName) color = livechat_color.chatbot;

    if(content.startsWith("☘️")) color = botlog_color.join_log;
    if(content.startsWith("🏮")) color = botlog_color.disconnect_log;

    if(content.startsWith('nhắn cho') || content.includes('nhắn:')) color = livechat_color.whisper;

    if(!bot.config.dev && color == livechat_color.dead) {
        let deathsRegex = require('../set').stats.deaths;
        let killBeforeRegex = require('../set').stats.killBef;
        let killAfterRegex = require('../set').stats.killAft;

		if(content.match(deathsRegex)) {
			let username = content.match(deathsRegex);
            saveDeaths(username[2]);
        }

        if(content.match(killBeforeRegex)) {
			let usernameList = content.match(killBeforeRegex);
            let uname = usernameList;

            if(uname.includes('\'')) uname = uname.split('\'')[0];

			saveKills(usernameList[2]);
			saveDeaths(usernameList[3]);
		}

		if(content.match(killAfterRegex)) {
			let usernameList = content.match(killAfterRegex);
            let uname = usernameList[3];

            if(uname.includes('\'')) uname = uname.split('\'')[0];

			saveDeaths(usernameList[1]);
            saveKills(uname);
		}

        async function saveDeaths(username) {
            let playerList = Object.values(bot.players).map(d => d.username);

            if(playerList.indexOf(username) < 0) return;

            let kdData = await kd.findOne({username:username});
            if(!kdData) return kd.create({username:username,deaths:1,kills:0});

            if(playerList.indexOf(username) > -1) {
                kdData.deaths += 1; 
                kdData.save();
            }
        }

        async function saveKills(username) {
            let playerList = Object.values(bot.players).map(d => d.username);

            if(playerList.indexOf(username) < 0) return;

            let kdData = await kd.findOne({username:username});
            if(!kdData) return kd.create({username:username,deaths:0,kills:1});

            kdData.kills += 1; 
            kdData.save();
        }
    }

    if(color == livechat_color.system) serverMessageList.push({
        description: chat,
        color: color,
        timestamp: new Date()
    });

    messageList.push({
        description: chat,
        color: color,
        timestamp: new Date()
    });

    if(serverMessageList.length == 5) {
        client.channels.cache.get(globalChnanel.server).send({
            embeds: serverMessageList
        }).catch(()=>{});
        serverMessageList = [];
    }
    if(messageList.length == 5) {
        client.channels.cache.get(bot.chatChannel).send({
            embeds: messageList
        }).catch(()=>{});
        messageList = [];
    }
}

function sendCustomMessage(type, content) {
    let color = 'GREEN';
    let channel;
    
    if(type == 'connect') channel = globalChnanel.join;
    if(content.includes("thoát")) color = "RED";

    joinList.push({
        description: content,
        color: color,
        timestamp: new Date()
    });

    if(joinList.length == 5) {
        client.channels.cache.get(channel).send({
            embeds:joinList
        }).catch(()=>{});
        joinList = [];
    }
}

function sendBotLog(type, content) {

    let chat = content;
    let color;

    if(type=='join') color = botlog_color.join_log;
    if(type=='queue') color = botlog_color.queue_log;
    if(type=='disconnect') color = botlog_color.disconnect_log;


    client.channels.cache.get(globalChnanel.log).send({
        embeds:[{
            description: chat,
            color: color
        }]
    });
}

function fetchData(message) {
    if(!message) return;
    if(message.match(require('../set').stats.deaths)
    || message.match(require('../set').stats.killBef)
    || message.match(require('../set').stats.killAft)
    || message.match(require('../set').stats.noStats)) return true;
}


function getUptime(bot, type) {
    // console.log(bot.uptime);
    if(!bot.uptime) return '';

    if(type == 'vi') return getDorHMS((Date.now()-bot.uptime)/1000, true);

    return getDorHMS((Date.now()-bot.uptime)/1000);
}

module.exports = {
    sendGlobalChat,
    sendBotLog,
    getUptime,
    sendCustomMessage,
}