const mongoose = require('mongoose');
const schema = mongoose.Schema({
    guildId: {type:String,default:undefined},
    livechat: {type:String,default:undefined}
});
module.exports = mongoose.model("setup", schema);