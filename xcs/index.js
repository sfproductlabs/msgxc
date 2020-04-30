const ePath = process.env.PROJECT ? `${__dirname}/.env.${process.env.PROJECT}` : `${__dirname}/.env`
require('dotenv').config({ path: ePath })
const R = require('ramda');
const debugWS = require('debug')('ws')
const debugHTTP = require('debug')('http')
const uWS = require('uWebSockets.js')
const httpCodes = require('./utils/httpStatusCodes')
const { decode } = require('./utils/ajwt')
const routeMatcher = require('route-matcher').routeMatcher;
const { ab2ip6, str2ip } = require('./utils/networking');
const ThreadRealtime = require('./pods/messaging/thread/realtime');
const { Route, RestRoute, WSRoute } = require('./pods');
const nats = require('./utils/nats')
const { validateUuid } = require('./utils/validations')
const { uuidWithin } = require('./utils/uuid')
const cookie = require('cookie');
const port = Number(process.env.PORT || 9001);
const sockets = new Set();
const idle = new Set();

var env = process.env.NODE_ENV || 'dev';
console.log(`Running app in ${env} mode`)

require('./pods/realtime/scheduler')

const router = {
  subscribe: routeMatcher(`${process.env.V2_PREFIX}/subscribe/:action`),
  report: routeMatcher(`${process.env.V2_PREFIX}/reports/:report`),
  execute: routeMatcher(`${process.env.V2_PREFIX}/execute/:action`),
  publish: routeMatcher(`${process.env.V2_PREFIX}/publish/:action`),  
  session: routeMatcher(`${process.env.V2_PREFIX}/connect/:vid/:sid`)
}

//APPLICATION START
const uApp = (env === 'dev') ? uWS.App : uWS.SSLApp;
const app = uApp({
  key_file_name: process.env.SITE_KEY,
  cert_file_name: process.env.SITE_CERT,
  passphrase: process.env.SITE_PWD,
  ssl_prefer_low_memory_usage: true
})
  .ws(`${process.env.V2_PREFIX}/*`, {
    /* Options */
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 0, //Disabled
    //idleTimeout: 15,
    /* Handlers */
    open: (ws, req) => {
      debugWS('A WebSocket connected via URL: ' + req.getUrl() + '!');      
      const params = router.session.parse(req.getUrl());
      if (!params.vid || validateUuid(params.vid) || validateUuid(params.sid) || !uuidWithin(params.sid, 3600*48*1000)) { //Check sid within 48 hours
        debugWS("[WARNING] Invalid connection parameters:",  params);
        ws.send(`{ "ok" : false, "error" : { "code": "${httpCodes.UNAUTHORIZED}", "msg": "Not a valid connection request." } }`);
        return ws.end(httpCodes.UNAUTHORIZED, "Not a valid connection request.");
      }
      ws.vid = params.vid;
      ws.sid = params.sid;
      ws.subscribe('/broadcast/system');
      debugWS("[WS Connected]");
      const ck = cookie.parse(req.getHeader("cookie"));
      if (ck) {
        ws.jwt = ck[process.env.CLIENT_AUTH_COOKIE];
      }
      sockets.add(ws)
    },
    message: (ws, msg, isBinary) => {
      let comms = {};
      comms.obj = R.tryCatch(JSON.parse, R.always({}))(Buffer.from(msg || ""))
      if (!comms.obj || !comms.obj.slug) {
        debugWS("Bad request...")
        ws.send(`{ "error" : "${httpCodes.NOT_FOUND}" }`, isBinary);
        nats.natsLogger.error({ ...comms, error: "Bad client request (slug missing)" });
        return;
      }
      comms.ws = ws;
      comms.isBinary = isBinary;
      debugWS(`Request (ws) ${comms.obj.slug}`);
      switch (true) {
        ///////////////////////////////////PUBLIC METHODS
        case /^\/api\/v2\/subscribe\/public-ephemeral/.test(comms.obj.slug):
          try {
            comms.params = router.subscribe.parse(comms.obj.slug);
            if (comms.params.action && comms.params.action.length && comms.params.action.length > 15 && comms.params.action.length < 60) {
              comms.ws.subscribe(`/thread/${comms.params.action}`)
            }
          } catch (ex) {
            debugWS(ex)
            nats.natsLogger.error({ ...comms, error: ex });
            Route.abort(ws, ex);
          }
          return;
        case /^\/api\/v2\/publish\/public-ephemeral/.test(comms.obj.slug):
          try {            
            comms.params = router.publish.parse(comms.obj.slug);
            if (comms.params.action && comms.params.action.length && comms.params.action.length > 15 && comms.params.action.length < 60) {
              ThreadRealtime.broadcast(comms.params.action, comms.obj)
            }
          } catch (ex) {
            debugWS('[ERROR] Publishing to ephemeral', ex)
          }
          return;
        ///////////////////////////////////END OF PUBLIC METHODS
        //MAKE SURE YOU CALL .authorizeUser FROM HERE on in
        //
        case /^\/api\/v2\/subscribe/.test(comms.obj.slug):
          try {
            comms.params = router.subscribe.parse(comms.obj.slug);
            new WSRoute(comms).authorizeUser().subscribeWebsocket()
          } catch (ex) {
            debugWS(ex)
            nats.natsLogger.error({ ...comms, error: ex });
            Route.abort(ws, ex);
          }
          return;
        case /^\/api\/v2\/publish/.test(comms.obj.slug):
          //TODO, only allow trusted publish to friends 
          ws.send(`{ "ok" : false, "error" : { "code": "${httpCodes.NOT_IMPLEMENTED}", "msg": "${comms.obj.slug} not implemented" } }`, isBinary);
          return;
        case /^\/api\/v2\/unsubscribe/.test(comms.obj.slug):
          ws.send(`{ "ok" : false, "error" : { "code": "${httpCodes.NOT_IMPLEMENTED}", "msg": "${comms.obj.slug} not implemented" } }`, isBinary);
          return;
        case /^\/ping$/.test(comms.obj.slug):
          ws.send(`{ "slug" : "${comms.obj.slug}", "data" : "pong" }`, isBinary);
          break;
        default:
          /* Ok is false if backpressure was built up, wait for drain */
          debugWS("Route not hit...", comms.obj.slug)
          ws.send(`{ "ok" : false, "error" : { "code": "${httpCodes.NOT_FOUND}", "msg": "${comms.obj.slug} not found" } }`, isBinary);
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
  .post(`${process.env.V2_PREFIX}/multicast`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).authorizeUser('msgxc_admin,admin').multicast()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  .post(`${process.env.V2_PREFIX}/broadcast`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).authorizeUser('msgxc_admin,admin').broadcast()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  .post(`${process.env.V2_PREFIX}/send`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).authorizeUser('msgxc_admin,admin').send()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  //ENLIST A DEVICE OR PROTOCOL
  .post(`${process.env.V2_PREFIX}/enlist`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).authorizeUser().enlist()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  //THREAD MESSAGING
  .post(`${process.env.V2_PREFIX}/publish`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).authorizeUser().publish()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  .post(`${process.env.V2_PREFIX}/subscribe`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).authorizeUser().subscribe()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  .post(`${process.env.V2_PREFIX}/unsubscribe`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).authorizeUser().unsubscribe()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  .post(`${process.env.V2_PREFIX}/cancel`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).authorizeUser('msgxc_admin,admin').cancel() //TODO: Users may cancel their own messages?
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  .post(`${process.env.V2_PREFIX}/execute/*`, async (res, req) => {
    let comms = { res, req };
    try {
      comms.params = router.execute.parse(req.getUrl());
      new RestRoute(comms).authorizeUser('msgxc_admin,admin').execute()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  //REPORTS
  .get(`${process.env.V2_PREFIX}/reports/*`, async (res, req) => {
    let comms = { res, req };
    try {
      comms.params = router.report.parse(req.getUrl());
      new RestRoute(comms).authorizeUser('msgxc_admin,admin').getReport()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  //STATUS
  .get(`${process.env.V2_PREFIX}/status/dbver`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).getDbVersion()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  .get(`${process.env.V2_PREFIX}/status/xasver`, async (res, req) => {
    let comms = { res, req };
    try {
      new RestRoute(comms).xasDbVersion()
    } catch (ex) {
      debugHTTP(ex)
      nats.natsLogger.error({ ...comms, error: ex });
      Route.abort(res, ex);
    }
  })
  //OPTIONS - CORS
  .options(`${process.env.V2_PREFIX}/*`, (res, req) => {
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
  .any(`${process.env.V2_PREFIX}/*`, (res, req) => {
    let comms = { res, req };
    const ex = `UNAUTHORIZED ${req.getMethod()}  ${req.getUrl()} from IP ${str2ip(req.getHeader('x-forwarded-for'))} to ${ab2ip6(res.getRemoteAddress())}`;
    debugHTTP(ex)
    nats.natsLogger.error({ ...comms, error: ex });
    res.writeStatus(httpCodes.NOT_IMPLEMENTED);
    res.end(httpCodes.NOT_IMPLEMENTED);
  })
  .get(`/ping`, (res) => {
    res.writeStatus(httpCodes.OK);
    res.end(httpCodes.OK);
  })
  .any('/*', (res, req) => {
    let comms = { res, req };
    const ex = `UNAUTHORIZED ${req.getMethod()}  ${req.getUrl()} from IP ${str2ip(req.getHeader('x-forwarded-for'))} to ${ab2ip6(res.getRemoteAddress())}`;
    debugHTTP(ex)
    nats.natsLogger.error({ ...comms, error: ex });
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