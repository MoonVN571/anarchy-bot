module.exports = {
    name: 'kicked',
    execute (bot, reason, loggedIn) {
        bot.logged = loggedIn;
        console.log(reason, loggedIn);
    }
}
