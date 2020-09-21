// 
// Cassandra
// 

'use strict';
require('dotenv').config();
const {boolean} = require("dotenv-utils");
const cassandra = require('cassandra-driver');
const assert = require('assert');
const fs = require('fs');

const distance = cassandra.types.distance;
let cassandraClient = null;
try {
  cassandraClient = new cassandra.Client({
    contactPoints: process.env.CASSANDRA_HOSTS.split(','),
    keyspace: process.env.CASSANDRA_KEYSPACE,
    queryOptions: { 
      consistency: cassandra.types.consistencies.quorum,
      fetchSize: 100000,
      prepare: true
    },
    policies: {
      loadBalancing: new cassandra.policies.loadBalancing.TokenAwarePolicy(new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy("DC1", 0)),
      reconnection: new cassandra.policies.reconnection.ExponentialReconnectionPolicy(500, 10 * 60 * 1000, false),
      retry: new cassandra.policies.retry.RetryPolicy()
    },  
    pooling: {
        coreConnectionsPerHost: {
          [distance.local] : 8,
          [distance.remote] : 1
        }
    },
    sslOptions : {  
      rejectUnauthorized: boolean(process.env.CASSANDRA_VERIFY_SERVER),
      key: fs.readFileSync(process.env.CASSANDRA_KEY),
      cert: fs.readFileSync(process.env.CASSANDRA_CERT),
      ca: fs.readFileSync(process.env.CASSANDRA_CACERT),
    }
  });

  cassandraClient.connect(function (err) {
      //assert.ifError(err);
      if (err) {
        console.error('[ERROR] Could not connect to c* cluster.', err);
      }
      else { 
        console.log(`Connected to c* cluster with ${cassandraClient.hosts.length} host(s): ${ cassandraClient.hosts.keys()}`);
      }
  });

  cassandraClient.on('error',(args) => {
    console.error("C* error", args);
  });
} catch {}

class Cassandra {
    constructor() {
      this.client = cassandraClient;
    }
    
    static newUuid() { return cassandra.types.Uuid.random() };

    static newTimeUuid() { return cassandra.types.TimeUuid.now() };

    static getDateFromTimeUuid(uuid) { return uuid.getDate() };

    static getTimeUuidFromDate(date) { return cassandra.types.TimeUuid.fromDate(date || new Date()) };    

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Cassandra;