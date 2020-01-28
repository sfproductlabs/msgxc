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
const { ab2ip6, str2ip} = require('./networking'); 

const hostname = os.hostname();

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
    if (typeof obj === 'object' && obj.res && obj.res.getRemoteAddress) {
        try { ip = ab2ip6(obj.res.getRemoteAddress()) } catch {}
    }
    if (obj.error) {
        return {
            ip : ip,
            msg : JSON.stringify(obj.error),
            type: 'err'
        };
    } else {
        return {
            ip : ip,
            msg : JSON.stringify(obj),
            type: null
        };
    }
    
};

//Default log by fastify...
//{"level":30,"time":1518588748299,"msg":"Server listening at http://127.0.0.1:3030","pid":28966,"hostname":"gandy","v":1}
const logNats = (obj, levelType, level, ip) => {
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
            nats.publish(
                `${prefixLog}${process.env.APP_NAME}.${levelType}`, 
                JSON.stringify({ 
                    level: level,
                    ltimenss: String(ns), //ltime nanosecond string
                    ldate: now.match(/(.*)T/i)[1],
                    id: `${prefixLog}${process.env.APP_NAME}.${parsed.type || levelType}`, 
                    msg: parsed.msg || null,
                    hostname : hostname,
                    ip : ip || parsed.ip || null
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
const LOG_LEVEL_FATAL = LOG_LEVELS[LOG_FATAL] = 32;
const LOG_LEVEL_ERROR = LOG_LEVELS[LOG_ERROR] = 16;
const LOG_LEVEL_WARN = LOG_LEVELS[LOG_WARN] = 8;
const LOG_LEVEL_INFO = LOG_LEVELS[LOG_INFO] = 4;
const LOG_LEVEL_DEBUG = LOG_LEVELS[LOG_DEBUG] = 2;
const LOG_LEVEL_TRACE = LOG_LEVELS[LOG_TRACE] = 1;
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

  