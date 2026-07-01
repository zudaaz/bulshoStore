const { connectDB, closeDB, getPool } = require("../db/pool");

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.closeDB = closeDB;
module.exports.getPool = getPool;
