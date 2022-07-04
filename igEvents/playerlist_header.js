const { getUptime } = require("../functions/minecraft");

module.exports = {
    name: 'playerlist_header',
    other: true,
    
    execute (bot, data) {
        if(bot.nextCheckTab) {
            setTimeout(()=>nextCheckTab=true, 5*60*1000);
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

            if(bot.mainServer) bot.client.channels.cache.get(bot.chatChannel).setTopic(completeStr);
        }
    }
}