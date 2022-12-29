const apikey = require('../databases/apikey');
module.exports = {
    name: 'apikey',
    dev: true,
    discordOnly: true,
    async execute(client, message, args) {
        const key = await getKey();
        async function getKey() {
            const key = gen(16);
            const db = await apikey.findOne({ key: key });
            if (!db) {
                await apikey.create({
                    key: key
                });
                return key;
            } else getKey();
        }
        message.author.send('`' + key + '`');
        function gen(length) {
            var result = '';
            var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            var charactersLength = characters.length;
            for (var i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }
    }
}
