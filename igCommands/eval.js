module.exports = {
    name: 'eval',
    admin: true,

    async execute(bot, username, args) {
        try {
            let e = await eval(args.join(" "));
            bot.sendMessage('whisper', 'Evaled: ' + e + '.');
        } catch(e) {
            bot.sendMessage('whisper', 'Error: ' + e.message + '.');
        }
    }
}