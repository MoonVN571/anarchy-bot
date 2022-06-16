const { getUptime } = require("../functions/minecraft");

let main = false;
module.exports = {
    name: 'playerlist_header',
    other: true,
    execute (bot, data) {
        if(!main) {
            main=true;
            setTimeout(()=>main=false, 5*60*1000);
        
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

            let completeStr = footer[1] +
            "\n- Đã vào server từ "+ getUptime(bot, 'vi') + 
            " trước" + "\n" + header.join("\n") + " \n" + footer.join("\n");

            bot.client.channels.cache.get(bot.chatChannel).setTopic(completeStr);
        }
    }
}