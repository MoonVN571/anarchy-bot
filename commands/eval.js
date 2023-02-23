module.exports = {
    name: 'eval',
    dev: true,
    discordOnly: true,
    async execute(client, message, args) {
        try {
            let e = await eval(args.join(' '));
            message.channel.send(`\`${e}\``);
        } catch (err) {
            message.channel.send(`\`${err.message}\``);
        }
    }
}