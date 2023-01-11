const dbList = require('../index');
module.exports = async (req, res) => {
    const server = req.params?.server;
    const key = req.query?.apikey || req.query?.key;
    const api = await dbList.find(db => db.name == 'anarchyvn').collection('apikeys').findOne({ key: key });
    if (!api) return res.send({
        statusCode: 404, msg: 'Invalid api key!'
    });
    console.log(`[${new Date().toLocaleString()}] ${key} | ${server} - ${data}`);
    const db = await dbList.find(db => db.name == server).collection('server').findOne({});
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
