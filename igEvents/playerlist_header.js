const { getUptime, sendGlobalChat } = require("../functions/minecraft");
const { setStatus } = require("../functions/utils");
const axios = require('axios');

module.exports = {
    name: 'playerlist_header',
    other: true,
    
    async execute (bot, data) {
        let minutes = 10;
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

            let est = header[5].trim() + '-' + header[6];
            let stt = header[5].trim();
            if(!bot.mainServer) {
                minutes = 1;
                sendGlobalChat(bot, est);
                setStatus('idle', 'PLAYING', stt);
            } else minutes = 10;
            
            let completeStr = footer[1] +   
            "\n- Đã vào server từ "+ getUptime(bot, true) + 
            " trước" + "\n" + header.join("\n") + " \n" + footer.join("\n");
            
            let tps = footer[1]?.split(" ")[0];

            if(bot.mainServer) {
                bot.client.channels.cache.get(require("../bot").channel.chat).setTopic(completeStr);
                
                await axios.default.get('https://api.mcsrvstat.us/2/2y2c.org').then(res => {
                    try {
                        let queue = res.data.players.online - 95;
                        if(queue < 95) queue = 0;
                        
                        setStatus('online', 'PLAYING', 'TPS: ' + tps + ' - Queue: ' + queue + ' - Prio: -1');
                    } catch(e) {
                        console.log(e);
                    }
                }).catch(err => console.log(err));
            }
        }
    }
}
