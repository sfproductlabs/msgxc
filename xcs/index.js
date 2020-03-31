
//const host = location.origin.replace(/^http/, 'ws')
//  var ws = new WebSocket('ws://localhost:9001/')
//  ws.onmessage = msg => console.log(msg)
// // ws.send('WebSockets are awesome!')
// ws.onerror = evt => console.error("WebSocket error observed:", event)
const ePath = process.env.PROJECT ? `${__dirname}/.env.${process.env.PROJECT}` : `${__dirname}/.env`
require('dotenv').config({path: ePath})
const R = require('ramda');
const debugWS = require('debug')('ws')
const debugHTTP = require('debug')('http')
const uWS = require('uWebSockets.js')
const httpCodes = require('./utils/httpStatusCodes')
const {decode} = require('./utils/ajwt')
const routeMatcher = require('route-matcher').routeMatcher;
const { ab2ip6, str2ip} = require('./utils/networking'); 
const {Route, RestRoute, WSRoute} = require('./pods');
const nats = require('./utils/nats')

const port = Number(process.env.PORT || 9001);
const sockets = new Set();
const idle = new Set();

var env = process.env.NODE_ENV || 'dev';
console.log(`Running app in ${env} mode`)

require('./pods/realtime/scheduler')

const uApp = (env === 'dev') ? uWS.App : uWS.SSLApp;
const router = {
  subscribe: routeMatcher(`${process.env.V1_PREFIX}/subscribe/:action`),
  report: routeMatcher(`${process.env.V1_PREFIX}/reports/:report`),
}
const app = uApp({
  key_file_name: process.env.SITE_KEY,
  cert_file_name: process.env.SITE_CERT,
  passphrase: process.env.SITE_PWD,
  ssl_prefer_low_memory_usage: true
}).ws('/*', {
  /* Options */
  compression: 0,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 0, //Disabled
  //idleTimeout: 15,
  /* Handlers */
  open: (ws, req) => {
    debugWS('A WebSocket connected via URL: ' + req.getUrl() + '!');
    ws.subscribe('broadcast/system');
    ws.req = req;
    ws.authorization = req.getHeader("authorization");
    debugWS("[WS Connected] ", ws);
    sockets.add(ws)
  },
  message: (ws, msg, isBinary) => {
      let comms = {};
      comms.obj = R.tryCatch(JSON.parse, R.always({}))(Buffer.from(msg || ""))  
      if (!comms.obj || !comms.obj.slug) {
        debugWS("Bad request...")
        ws.send(`{ "error" : "${httpCodes.NOT_FOUND}" }`, isBinary);  
        nats.natsLogger.error({...comms, error: "Bad client request (slug missing, potential hack attempt)"});        
        return;
      }
      comms.ws = ws;
      comms.isBinary = isBinary;
      debugWS(`Request (ws) ${comms.obj.slug}`);  
      switch (true) {
        case /^\/api\/v1\/subscribe\//.test(comms.obj.slug):           
          try {            
            comms.params = router.subscribe.parse(comms.obj.slug);
            new WSRoute(comms).authorizeUser().subscribeWebsocket()            
          } catch (ex) {
            debugHTTP(ex)
            nats.natsLogger.error({...comms, error: ex});
            Route.abort(ws, ex);
          }            
          return;
        case /^\/api\/v1\/publish/.test(comms.obj.slug):
          //TODO, only allow trusted publish to friends 
          ws.send(`{ "error" : "${httpCodes.NOT_IMPLEMENTED}" }`, isBinary);  
          return;        
        case /^\/api\/v1\/unsubscribe/.test(comms.obj.slug):   
          ws.send(`{ "error" : "${httpCodes.NOT_IMPLEMENTED}" }`, isBinary);  
          return;
        case /^\/api\/v1\/admin/.test(comms.obj.slug):   
          ws.send(`{ "error" : "${httpCodes.NOT_IMPLEMENTED}" }`, isBinary);  
          return;
        case /^\/ping$/.test(comms.obj.slug): 
          ws.send(`{ "slug" : "${comms.obj.slug}", "data" : "pong" }`, isBinary);               
          break;
        default:
          /* Ok is false if backpressure was built up, wait for drain */
          debugWS("Route not hit...")
          let ok = ws.send(`{ "error" : "${httpCodes.NOT_FOUND}" }`, isBinary);
          break;
      }   
  },
  drain: (ws) => {
    // actually it's better to check bufferedAmount here
    debugWS('Draining...')
    sockets.add(ws);
    idle.delete(ws);
    debugWS('WebSocket backpressure: ' + ws.getBufferedAmount());
  },
  close: (ws, code, message) => {
    debugWS('Closing...')
    sockets.delete(ws);
    idle.delete(ws);
    debugWS('WebSocket closed, sockets open:', sockets.size);
  }
})
//SYSTEM MESSAGING
.post(`${process.env.V1_PREFIX}/multicast`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).authorizeUser('msgxc_admin,admin').multicast()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
.post(`${process.env.V1_PREFIX}/broadcast`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).authorizeUser('msgxc_admin,admin').broadcast()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
.post(`${process.env.V1_PREFIX}/send`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).authorizeUser('msgxc_admin,admin').send()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
//ENLIST A DEVICE OR PROTOCOL
.post(`${process.env.V1_PREFIX}/enlist`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).authorizeUser().enlist()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
//THREAD MESSAGING
.post(`${process.env.V1_PREFIX}/publish`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).authorizeUser().publish()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
.post(`${process.env.V1_PREFIX}/subscribe`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).authorizeUser().subscribe()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
.post(`${process.env.V1_PREFIX}/unsubscribe`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).authorizeUser().unsubscribe()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
.post(`${process.env.V1_PREFIX}/cancel`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).authorizeUser('msgxc_admin,admin').cancel() //TODO: Users may cancel their own messages?
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
//REPORTS
.get(`${process.env.V1_PREFIX}/reports/*`, async (res, req) => {
  let comms = {res, req};
  try {
    comms.params = router.report.parse(req.getUrl());
    new RestRoute(comms).authorizeUser('msgxc_admin,admin').getReport()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
//STATUS
.get(`${process.env.V1_PREFIX}/status/dbver`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).getDbVersion()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
.get(`${process.env.V1_PREFIX}/status/xasver`, async (res, req) => {
  let comms = {res, req};
  try {
    new RestRoute(comms).xasDbVersion()
  } catch (ex) {
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    Route.abort(res, ex);
  }
})
.get(`${process.env.V1_PREFIX}/ping`, (res) => {
  res.writeStatus(httpCodes.OK);       
  res.end(httpCodes.OK);  
})
//OPTIONS - CORS
.options(`${process.env.V1_PREFIX}/*`, (res, req) => {
  res.writeStatus(httpCodes.OK);       
  res.writeHeader("Content-Type", "application/json")
  res.writeHeader("Access-Control-Allow-Origin", "*") //TODO: Update CORS
  res.writeHeader("Access-Control-Allow-Methods", "GET, POST, HEAD, DELETE, PUT")
  res.writeHeader("Access-Control-Allow-Headers", "Content-Type, Header, Authorization, Accept, User")
  res.writeHeader("Access-Control-Allow-Credentials", "true")
  res.writeHeader("Access-Control-Max-Age", "1728000")
  res.writeHeader("Vary", "Accept-Encoding, Origin")
  res.writeHeader("Keep-Alive", "timeout=2, max=100")
  res.writeHeader("Connection", "Keep-Alive")
  res.writeHeader("Author", "SFPL")
  res.end();  
})
//CATCH ALL
.any(`${process.env.V1_PREFIX}/*`, (res, req) => {
    let comms = {res, req};
    const ex = `UNAUTHORIZED ${req.getMethod()}  ${req.getUrl()} from IP ${str2ip(req.getHeader('x-forwarded-for'))} to ${ab2ip6(res.getRemoteAddress())}`;
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    res.writeStatus(httpCodes.NOT_IMPLEMENTED);       
    res.end(httpCodes.NOT_IMPLEMENTED);  
})
.any('/*', (res, req) => {
    let comms = {res, req};
    const ex = `UNAUTHORIZED ${req.getMethod()}  ${req.getUrl()} from IP ${str2ip(req.getHeader('x-forwarded-for'))} to ${ab2ip6(res.getRemoteAddress())}`;
    debugHTTP(ex)
    nats.natsLogger.error({...comms, error: ex});
    res.writeStatus(httpCodes.NOT_FOUND);
    res.end(httpCodes.NOT_FOUND);
}).listen(port, (token) => {
  if (token) {
    console.log('Listening to port ' + port);
    //uWS.us_listen_socket_close(listenSocket);
  } else {
    console.log('Failed to listen to port ' + port);
  }
});

wsSockets = () => { return sockets; }
wsIdle = () => { return idle; }
appInstance = () => { return app; }
module.exports = {
  wsSockets,
  wsIdle,
  appInstance
}