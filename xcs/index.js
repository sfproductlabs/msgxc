
//const host = location.origin.replace(/^http/, 'ws')
//  var ws = new WebSocket('ws://localhost:9001/')
//  ws.onmessage = msg => console.log(msg)
// // ws.send('WebSockets are awesome!')
// ws.onerror = evt => console.error("WebSocket error observed:", event)
require('dotenv').config()
const R = require('ramda');
const debugWS = require('debug')('ws')
const debugHTTP = require('debug')('http')
const uWS = require('uWebSockets.js')
const httpCodes = require('./utils/httpStatusCodes')
const {decode} = require('./utils/ajwt')
const routeMatcher = require('route-matcher').routeMatcher;
const { ab2ip6, str2ip} = require('./utils/networking'); 
const {Route, RestRoute, WSRoute} = require('./pods');

const port = Number(process.env.PORT || 9001);
const sockets = new Set();
const idle = new Set();

var env = process.env.NODE_ENV || 'dev';
console.log(`Running app in ${env} mode`)

require('./pods/realtime/scheduler')

const uApp = (env === 'dev') ? uWS.App : uWS.SSLApp;
const router = {
  subscribe: routeMatcher(`${process.env.V1_PREFIX}/sub/:action`),
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
    sockets.add(ws)
  },
  message: (ws, msg, isBinary) => {
      let comms = {};
      comms.obj = R.tryCatch(JSON.parse, R.always({}))(Buffer.from(msg || ""))  
      comms.ws = ws;
      comms.isBinary = isBinary;
      debugWS(`Request (ws) ${comms.obj.slug}`);  
      switch (true) {
        case /^\/api\/v1\/sub\//.test(comms.obj.slug):           
          try {
            //Get the action
            comms.params = router.subscribe.parse(comms.obj.slug);
            const route = new WSRoute(comms)
            switch (comms.params.action) {
              default:
                  ws.send(`{ "error" : "${httpCodes.NOT_IMPLEMENTED}", "ok": false, "slug" : "${comms.obj.slug}", "action" : "${comms.params.action}" }`, isBinary);
            }
          } catch (ex) {
            debugHTTP(ex)
            Route.abort(ws, ex);
          }            
          return;
        case /^\/api\/v1\/pub/.test(comms.obj.slug):
          //TODO, only allow trusted publish to friends 
          ws.send(`{ "error" : "${httpCodes.NOT_IMPLEMENTED}" }`, isBinary);  
          return;        
        case /^\/api\/v1\/unsub/.test(comms.obj.slug):   
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
//MESSAGING
.post(`${process.env.V1_PREFIX}/broadcast`, async (res, req) => {
  try {
    new RestRoute({res, req}).authorizeUser('msgxc_admin,admin').broadcast()
  } catch (ex) {
    debugHTTP(ex)
    Route.abort(res, ex);
  }
})
.post(`${process.env.V1_PREFIX}/send`, async (res, req) => {
  try {
    new RestRoute({res, req}).authorizeUser().send()
  } catch (ex) {
    debugHTTP(ex)
    Route.abort(res, ex);
  }
})
.post(`${process.env.V1_PREFIX}/native/subscribe`, async (res, req) => {
  try {
    new RestRoute({res, req}).authorizeUser().subscribe()
  } catch (ex) {
    debugHTTP(ex)
    Route.abort(res, ex);
  }
})
//STATUS
.get(`${process.env.V1_PREFIX}/status/dbver`, async (res, req) => {
  try {
    new RestRoute({res, req}).getDbVersion()
  } catch (ex) {
    debugHTTP(ex)
    Route.abort(res, ex);
  }
})
.get(`${process.env.V1_PREFIX}/ping`, (res) => {
  res.writeStatus(httpCodes.OK);       
  res.end(httpCodes.OK);  
})
//CATCH ALL
.any(`${process.env.V1_PREFIX}/*`, (res, req) => {
    debugHTTP("UNAUTHORIZED", req.getMethod(), req.getUrl(), 'from IP', str2ip(req.getHeader('x-forwarded-for')), 'to', ab2ip6(res.getRemoteAddress()))
    res.writeStatus(httpCodes.NOT_IMPLEMENTED);       
    res.end(httpCodes.NOT_IMPLEMENTED);  
})
.any('/*', (res, req) => {
    debugHTTP("UNAUTHORIZED", req.getMethod(), req.getUrl(), 'from IP', str2ip(req.getHeader('x-forwarded-for')), 'to', ab2ip6(res.getRemoteAddress()))
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