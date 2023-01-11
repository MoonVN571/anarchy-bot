const { servers, type } = require('../api.json');
const dbList = require('../index');
module.exports = async (req, res) => {
    const username = req.params?.username;
    const stats = req.params?.stats;
    const server = req.params?.server;
    const key = req.query?.apikey || req.query?.key;
    const api = await dbList.find(db => db.name == 'anarchyvn').collection('apikeys').findOne({ key: key });
    if (!api) return res.send({
        statusCode: 404, msg: 'Invalid api key!'
    });
    console.log(`[${new Date().toLocaleString()}] ${key} | ${server} - ${stats} - ${username}`);
    if (servers.indexOf(server) == -1)
        return res.send({ statusCode: 404, msg: `Server '${server}' not found on server!` });
    if (type.indexOf(stats) == -1)
        return res.send({ statusCode: 404, msg: `Data '${stats}' not found on server!` });
    const db = await dbList.find(db => db.name == server).collection(stats == 'stats' ? 'stats2' : stats + 's').findOne({
        username: {
            $regex: new RegExp(`^${username}$`), $options: 'i'
        },
    });
    if (!username || !db)
        return res.send({ statusCode: 404, msg: `Username '${username}' not found on server!` });
    let data = {};
    for (let key in db) {
        if (key !== '__v' && key !== '_id') data[key] = db[key];
    }
    res.send({
        statusCode: 200,
        msg: 'Success',
        data: data
    });
}
