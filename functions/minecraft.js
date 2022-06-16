const client = require('../index').discord;
const { getDorHMS } = require('./utils');
const kd = require('../db/stats');

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

    if(username == require('../bot').settings.botName) color = livechat_color.chatbot;

    if(content.startsWith("☘️")) color = botlog_color.join_log;
    if(content.startsWith("🏮")) color = botlog_color.disconnect_log;

    if(content.startsWith('nhắn cho') || content.includes('nhắn:')) color = livechat_color.whisper;

    if(color == livechat_color.dead) {
        let deathsRegex = require('../set').stats.deaths;
        let killBeforeRegex = require('../set').stats.killBef;
        let killAfterRegex = require('../set').stats.killAft;

		if(content.match(deathsRegex)) {
			let playerList = Object.values(bot.players).map(d => d.username);
			let username = content.split(" ")[0];
            // console.log(content.match(deathsRegex));

            let kdData = await kd.findOne({username:username});
            if(!kdData) return kd.create({username:username,deaths:1,kills:0});

            if(playerList.indexOf(username) > -1) {
                kdData.deaths += 1; 
                kdData.save();
            }
        }
        /*
		if(logger.match(killBeforeRegex)) {
			let playerList = Object.values(bot.players).map(d => d.username);
			let usernameList = logger.replace(killAfterRegex, ' | ').split(" | ");

			if(playerList.indexOf(usernameList[1]) > -1) saveDead(usernameList[1], logger);
			if(playerList.indexOf(usernameList[0]) > -1) saveKills(usernameList[0], logger);
		}*/

		if(content.match(killAfterRegex)) {
			let playerList = Object.values(bot.players).map(d => d.username);
			let usernameList = content.match(killAfterRegex);
            
            // console.log(usernameList);

			if(playerList.indexOf(usernameList[0]) > -1) {
                let kdData1 = await kd.findOne({username:usernameList[1]});
                if(!kdData1) return kd.create({username:usernameList[1],deaths:1,kills:0});
                
                kdData1.deaths += 1;
                kdData1.save();
            }

            if(playerList.indexOf(usernameList[1]) > -1) {
                let kdData2 = await kd.findOne({username:usernameList[2]});
                if(!kdData2) return kd.create({username:usernameList[2],deaths:0,kills:1});

                kdData2.kills += 1; 
                kdData2.save();
            }
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
        client.channels.cache.get('986807303565086781').send({
            embeds: serverMessageList
        }).catch(()=>{});
        serverMessageList = [];
    }
    if(messageList.length == 5) {
        client.channels.cache.get('986599157068361734').send({
            embeds: messageList
        }).catch(()=>{});
        messageList = [];
    }
}

function sendCustomMessage(type, content) {
    let color = livechat_color.system;
    let channel;

    if(type == 'connect') channel = '986601627588894720';
    // if(type == 'donator') channel = '838711105278705695'; 
    // if(type == 'tps') channel = '852158457624657941';
    // if(type == 'oldfag')channel = '807506107840856064';

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


    client.channels.cache.get('986601542981410816').send({
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

    if(type == 'vi') return getDorHMS(Date.now()-bot.uptime, true);

    return getDorHMS(Date.now()-bot.uptime);
}

module.exports = {
    sendGlobalChat,
    sendBotLog,
    getUptime,
    sendCustomMessage,
}