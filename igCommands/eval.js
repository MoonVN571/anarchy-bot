module.exports = {
    name: 'eval',
    dev: true,

    async execute(bot, username, args) {
        try {
            let e = await eval(args.join(" "));
            bot.sendMessage('whisper', 'Evaled: ' + e + '.');
        } catch(e) {
            bot.sendMessage('whisper', 'Error: ' + e.message + '.');
        }
    }
}