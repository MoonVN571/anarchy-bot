const mongoose = require('mongoose');
const schema = mongoose.Schema({
    key: String
});
module.exports = mongoose.model("apikey", schema);