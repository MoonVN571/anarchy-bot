const { log } = require('../../functions/utils');
const supportData = ['joindate', 'playtime', 'stats', 'seen'];
joindate = require('../../databases/joindate');
seen = require('../../databases/seen');
playtime = require('../../databases/playtime');
stats = require('../../databases/stats');
const apiKey = require('../../databases/apiKey');
module.exports = async (req, res) => {
    const username = req.params?.username;
    const data = req.params?.data;
    const key = req.query?.apikey || req.query.key;
    const api = await apiKey.findOne({ key: key });
    if (!api) return res.send({
        statusCode: 404, msg: 'Invalid api key!'
    });
    log(`${key}: ${req.url}`);
    if (supportData.indexOf(data) == -1)
        return res.send({ statusCode: 404, msg: `Data '${data}' not found on server!` });
    const db = await eval(`${data}`).find({
        username: {
            $regex: new RegExp(`^${username}$`), $options: 'i'
        },
    }, { _id: 0, __v: 0 });
    if (!username || !db[0])
        return res.send({ statusCode: 404, msg: `Username '${username}' not found on server!` });
    res.send({
        statusCode: 200,
        msg: 'Success',
        data: db[0]
    });
}
