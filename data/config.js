const mysql = require('mysql');

const config = {
    host: "localhost",
    user: "root",
    password: "",
    database: "bowlingapi",
    //database: "testapi",
    port: 3306
};

const pool = mysql.createPool(config);

module.exports = pool;