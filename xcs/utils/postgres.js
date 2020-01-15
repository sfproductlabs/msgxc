// 
// Cassandra
// 


'use strict';

const { Pool } = require('pg')
const fs = require('fs')

const pgConfig = {
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    ssl : (process.env.POSTGRES_SSL === 'true' ? {
      rejectUnauthorized : process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true,
      ca   : process.env.POSTGRES_CA ? fs.readFileSync(process.env.POSTGRES_CA).toString() : undefined,
      key  : process.env.POSTGRES_KEY ? fs.readFileSync(process.env.POSTGRES_KEY).toString() : undefined,
      cert : process.env.POSTGRES_CERT ? fs.readFileSync(process.env.POSTGRES_CERT).toString() : undefined,
    } : undefined),
    port: parseInt(process.env.POSTGRES_PORT) || 5433  
}

const pool = new Pool(pgConfig)

pool.query('SELECT NOW()', (err, res) => {
  if (err)
    console.error(err);
  console.log("Connected to Postgres:", res.rows[0])
  //pool.end() //re-use this
})

class Postgres {
    constructor() {
      this.pool = pool;
      this.config = pgConfig;
    }
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Postgres;