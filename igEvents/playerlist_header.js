const axios = require('axios');

const { getUptime, sendGlobalChat } = require("../functions/minecraft");
const { setStatus } = require('../functions/botFunc');
const { log } = require("../functions/utils");

let minutes = 5;

module.exports = {
    name: 'playerlist_header',
    other: true,
    
    async execute (bot, data) {
        if(bot.nextCheckTab) {
            setTimeout(()=>bot.nextCheckTab=true, minutes*60*1000);
            bot.nextCheckTab = false;

            let parsedHeader = JSON.parse(data.header);
            let parsedFooter = JSON.parse(data.footer);
            
            let cleanArray = (str) => {
                if(!str) return;
                str = str.replace(/\u00A7[0-9A-FK-OR]|-/ig,'')
                .split("\n")
                .filter(str=>str||str.trim()||str!=="\n");
                return str;
            }

            let header = cleanArray(parsedHeader?.text);
            let footer = cleanArray(parsedFooter?.text);

            if(!header) return;
            let completeStr = footer[1] +   
            "\n- Đã vào server từ "+ getUptime(bot, true) + 
            " trước" + "\n" + header.join("\n") + " \n" + footer.join("\n");

            if(bot.mainServer) bot.client.channels.cache.get(require("../bot").channel.chat).setTopic(completeStr);
            let tps = footer[1]?.trim().split(" ")[0];

            setStatus('online', 'PLAYING', 'TPS: ' + tps);
            /*
            await axios.default.get('https://api.mcsrvstat.us/2/2b2c.org').then(res => {
                try {
                    // BOT STATUS MAIN SERVER TAB
                    let completeStr = footer[1] +   
                    "\n- Đã vào server từ "+ getUptime(bot, true) + 
                    " trước" + "\n" + header.join("\n") + " \n" + footer.join("\n");

                    if(bot.mainServer) bot.client.channels.cache.get(require("../bot").channel.chat).setTopic(completeStr);
                    
                    let queue = res.data.players?.online - 100 || 0;
                    if(queue < 0) queue = 0;
                    
                    let est = header[4].trim() + ' -' + header[5];
                    let parseBotQ = header[4].trim().split(" ");
                    let botQ = parseBotQ[parseBotQ.length-1];

                    if(!bot.mainServer) {
                        if(botQ == 'None') botQ = 1;
                        if(queue == 0) queue = 1;
                        let stt = 'trong hàng chờ: ' + botQ + '/' + queue;
                        
                        // log(est);
                        sendGlobalChat(bot, est);
                        setStatus('idle', 'PLAYING', stt);
                    } else {
                        minutes = 5;
                        let tps = footer[1]?.split(" ")[0];
                        // log('tps: '+ tps);
                        setStatus('online', 'PLAYING', 'TPS: ' + tps + ' - Hàng Chờ: ' + queue);
                    }
                } catch(e) {
                    console.log(e);
                }
            }).catch(err => console.log(err)); */
        }
    }
}
