// 
// Nats & Server side Logging (use API for client side)
// 
'use strict';
//require('dotenv').load(); //NOTE: Should be called in main method
const os = require('os');
const fs = require('fs');
const nano = require('nano-seconds');
const R = require('ramda');
const Nats = require("nats");
const { req2ip } = require('./networking'); 

const hostname = os.hostname();
let hostip = null;
const ifaces = os.networkInterfaces();
if (ifaces) {
    const ifaces2 = Object.keys(ifaces).map(function(key) {
        return [Number(key), ifaces[key]];
    });
    if (ifaces2) {
        const iface = R.find(R.whereEq({ internal : false, family: 'IPv4'}))(R.flatten(ifaces2));
        if (iface && iface.address) {
            hostip = iface.address;
        }
    }
}

//Setup prefixes so telegraf works
const prefixLog = process.env.NATS_PREFIX_LOG || ''; //Should be api.log.
const prefixCount = process.env.NATS_PREFIX_COUNT || ''; //Should be api.count.
const prefixUpdate = process.env.NATS_PREFIX_UPDATE || ''; ////Should be api.update.

const nats = Nats.connect({
    //"pubsub$" : true,
    "servers": (process.env.NATS_HOSTS || "nats://localhost:4222").split(","),
    "maxReconnectAttempts": -1,
    "reconnectTimeWait": 250,
    "yieldTime": 4,
    "tls": {
        rejectUnauthorized: false,
        key: fs.readFileSync(process.env.NATS_KEY),
        cert: fs.readFileSync(process.env.NATS_CERT),
        ca: [fs.readFileSync(process.env.NATS_CACERT)]
    }
});
console.log("Connected to NATS");
const parseObj = (obj) => {
    if (typeof obj === 'string')
        return {msg : obj};
    let ip = null;
    if (typeof obj === 'object' && (obj.res || obj.headers)) {
        ip = req2ip(obj);
    }
    const owner = obj.user ? (obj.user.uid || obj.user.id) : null;
    let params = {};
    params.protocol = obj.protocol;
    params.url = obj.url;
    params.method = obj.method;
    if (process.env.NATS_LOG_HEADERS && obj && obj.headers && typeof obj.headers === 'object') {
        params = {...obj.headers, ...params}
    }
    if (obj.error) {        
        if (typeof obj.error.code === 'string') {
            params.status = obj.error.code.split(' ')[0];
            params.level = (params.status && params.status.length && params.status.length > 0) ? ((params.status[0] == '4') ? 'warning' : 'error') : 'info';
        }
        return {
            ip : ip,
            msg : obj.error.msg || JSON.stringify(obj.error),
            type: 'err',
            params,
            owner
        };
    } else {
        return {        
            ip : ip,
            msg : JSON.stringify(obj),
            type: null,
            params,
            owner
        };
    }
    
};

//Default log by fastify...
//{"level":30,"time":1518588748299,"msg":"Server listening at http://127.0.0.1:3030","pid":28966,"hostname":"gandy","v":1}
const logNats = (obj, levelType, level, ip, name='generic') => {
    try {
        if (R.isNil(obj) || R.isEmpty(obj))
        {
            console.error("Could not log to nats.", levelType, obj, ip)
            if (process.env.NODE_ENV !== 'production') 
                debugger;
            return;
        }
        const now = nano.toISOString();
        levelType = levelType || LOG_INFO;
        level = level || LOG_LEVELS[levelType];
        const nsa = now.match(/.*T(.*)Z/i)[1].split(":").map(Number.parseFloat)
        const ns = (Number.parseInt(nsa[0])*3600*1e9)+ (Number.parseInt(nsa[1])*60*1e9)+Number.parseInt(nsa[2]*1e9)
        if (level >= appLogLevel)
        {
            let parsed = parseObj(obj);   
            let topic = `${prefixLog}${process.env.APP_NAME}.${levelType}`;
            nats.publish(
                topic, 
                JSON.stringify({
                    name: name, //for filtering in admin, fixed value per backend
                    topic: topic,          //for filtering in admin, usually 'generic' unless custom debug logging
                    level: level,
                    ltimenss: String(ns), //ltime nanosecond string
                    ldate: now.match(/(.*)T/i)[1],
                    id: `${prefixLog}${process.env.APP_NAME}.${parsed.type || levelType}`, //this is ignored and replaced by topic
                    msg: parsed.msg || null,
                    hostname : hostname,
                    host: hostip,
                    ip : ip || parsed.ip || null,
                    params : parsed.params,
                    owner: parsed.owner
                })
            );        
        }
    } catch (ex) {
        console.error("Could not log to nats: ", ex, levelType, obj, ip)
        if (process.env.NODE_ENV !== 'production') 
            debugger;
        return;
    }
};

const logUpdateNats = (obj, key) => {
    if (R.isNil(key) || R.isEmpty(key) || R.isNil(obj) || R.isEmpty(obj))
    {
        console.log("Could not log update to nats.")
        if (process.env.NODE_ENV !== 'production') 
            debugger;
        return;
    }
    const now = nano.toISOString(); 
    nats.publish(
        `${prefixUpdate}${process.env.APP_NAME}.${key}`, 
        JSON.stringify({ 
            id: `${prefixUpdate}${process.env.APP_NAME}.${key}`, 
            msg: (typeof obj === 'string') ? obj : JSON.stringify(obj),
            updated : Date.now()
        })
    ); 
}    


const logCountNats = (key) => nats.publish(`${prefixCount}${process.env.APP_NAME}.${key}`, JSON.stringify({ id: `${process.env.APP_NAME}.${key}`}));

const LOG_INFO = 'info';
const LOG_ERROR = 'error';
const LOG_DEBUG = 'debug';
const LOG_FATAL = 'fatal';
const LOG_WARN  = 'warn';
const LOG_TRACE = 'trace';
const LOG_CHILD = 'child';
const LOG_NONE = 'none';


const LOG_LEVELS = {};
const LOG_LEVEL_FATAL = LOG_LEVELS[LOG_FATAL] = 60;
const LOG_LEVEL_ERROR = LOG_LEVELS[LOG_ERROR] = 50;
const LOG_LEVEL_WARN = LOG_LEVELS[LOG_WARN] = 40;
const LOG_LEVEL_INFO = LOG_LEVELS[LOG_INFO] = 30;
const LOG_LEVEL_DEBUG = LOG_LEVELS[LOG_DEBUG] = 20;
const LOG_LEVEL_TRACE = LOG_LEVELS[LOG_TRACE] = 10;
const LOG_LEVEL_NONE = LOG_LEVELS[LOG_NONE] = Number.MAX_SAFE_INTEGER;

//BY DEFAULT WE HAVE LOGGING TURNED OFF
const appLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVEL_NONE;


const natsLogger = {
    info: (obj) =>  { logNats(obj, LOG_INFO, LOG_LEVEL_INFO) },
    error: (obj) => { logNats(obj, LOG_ERROR, LOG_LEVEL_ERROR) },
    debug: (obj) => logNats(obj, LOG_DEBUG, LOG_LEVEL_DEBUG),
    fatal: (obj) => logNats(obj, LOG_FATAL, LOG_LEVEL_FATAL),
    warn: (obj) => logNats(obj, LOG_WARN, LOG_LEVEL_WARN),
    trace: (obj) => logNats(obj, LOG_TRACE, LOG_LEVEL_TRACE),
    child: () => natsLogger 
}

// Wrapping a plugin function with fastify-plugin exposes the decorators,
// hooks, and middlewares declared inside the plugin to the parent scope.
module.exports = {
    log : (obj, levelType, ip) => logNats(obj, levelType, LOG_LEVELS[levelType || LOG_LEVEL_INFO], ip),
    logCount : logCountNats,
    logUpdate : logUpdateNats,
    nats,
    natsLogger,
    instance : () => { return nats; }
}

  