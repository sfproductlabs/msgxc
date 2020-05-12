/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Messaging model                                                                                */
/*                                                                                                */
/* All database calls go through the model.                                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const R = require('ramda');
const uuidv1 = require('uuid/v1');
const APN = require('../../../utils/apn')
const FCM = require('../../../utils/fcm')
//const sms = require('../../utils/sms')
const cxn = require('../../../utils/cassandra');
const httpCodes = require('../../../utils/httpStatusCodes')
const nats = require('../../../utils/nats')
const debugSysMessage = require('debug')('sys-msg')
const track = require('../../../utils/track')

class SysMessaging {

  static async multicast(comms) {
    const db = new cxn();
    try {
      if (!comms.obj.uids || !Array.isArray(comms.obj.uids)) {
          nats.natsLogger.info({...comms, error: { code : '200', msg : 'Multicast requires uids.'}});
          return false;
      }
      for (let i = 0; i < comms.obj.uids.length; i++) {
        if (comms.obj.uids[i].length !== 36) {
          continue;
        }
        //TODO: Run an Elassandra query when bug is fixed
        const user = (await db.client.execute(
          `select uid,mtypes,mdevices from users where uid=?`, [
          comms.obj.uids[i]
        ], {
          prepare: true
        })).first()
        await SysMessaging.send(comms, user);
      }
      nats.natsLogger.info(`[MULTICASTED] ${comms.obj.msg} to ${comms.obj.uids}`);
    } catch {
      try {
        nats.natsLogger.error({...comms, error: { code : '500', msg : 'Unknown error multicasting', ex}});
      } catch {}
      console.warn(ex);
      switch (ex.code) {
        case httpCodes.INTERNAL_SERVER_ERROR:
        default:
          throw ex; // Internal Server Error for uncaught exception
      }
    }    
    return true;
  }

  static async broadcast(comms) {
    const db = new cxn();
    try {
      return new Promise((resolve, reject) => {
        db.client.stream('SELECT * FROM users')
          .on('readable', function () {
            let row;
            // 'readable' is emitted as soon a row is received and parsed
            while (row = this.read()) {
              //TODO: AG MOVE TO BATCHING
              try {
                (async () => { await SysMessaging.send(comms, row)})();
              } catch {} //TODO: AG might want to catch errors here.
            }
          })
          .on('end', function () {
            // Stream ended, there aren't any more rows
            nats.natsLogger.info(`[BROADCASTED] ${comms.obj.msg}`);
            resolve(true);
          })
          .on('error', function (err) {
            // Something went wrong: err is a response error from Cassandra
            nats.natsLogger.info({...this.comms, error: { code : '500', msg : JSON.stringify(err)}});
            resolve(false);
          });
      });

    } catch (ex) {
      try {
        nats.natsLogger.error({...comms, error: { code : '500', msg : 'Unknown error broadcasting', ex}});
      } catch {}
      console.warn(ex);
      switch (ex.code) {
        case httpCodes.INTERNAL_SERVER_ERROR:
        default:
          throw ex; // Internal Server Error for uncaught exception
      }
    }
  }

  static async send(comms, user = null) {
    const db = new cxn();
    let sent = false;
    try {
      if (!user) {
        if (!comms.obj.uid) {
          return false;          
        }
        user = (await db.client.execute(
          `select uid,mtypes,mdevices from users where uid=?`, [
          comms.obj.uid
        ], {
          prepare: true
        })).first()
      }

      if (user.mtypes) {
        if (user.mtypes.find(e => e == "~")) {
          return false;
        }
      }

      //TODO: Message Type filtering Ex. SMS-only
      if (user.mdevices) {
        const apns = user.mdevices.filter(device => device.mtype === 'apn');
        apns.map(async mdevice => {
          const results = await APN.send(mdevice.did, comms.obj.msg, comms.obj.opts);
          //TODO: AG Manage Failures, Triage   
          if (results && results.sent && results.sent.length && results.sent.length > 0) {
            track({
              ename : "msent",
              etyp: "apn",
              ptyp: "sys",
              uid: user.uid,
              vid: user.uid,
            })
            sent = true;
          } else {
              const reason = R.path(['failed', '0', 'response', 'reason'], results || {});
              track({
                ename : "mfail",
                etyp: "apn",
                ptyp: "sys",
                uid: user.uid,
                vid: user.uid,
                did : mdevice.did,
                error: reason
              })
              SysMessaging.prune(user.uid, mdevice);
          }
          if (process.env.NODE_ENV == 'dev') debugSysMessage(`[APN RESULT] ${JSON.stringify(results)}`)          
        });

        const fcms = user.mdevices.filter(device => device.mtype === 'fcm');
        fcms.map(async mdevice => {
          const results = await FCM.send(mdevice.did, comms.obj.msg, comms.obj.opts);
          if (results && results.success) {
            track({
              ename : "msent",
              etyp: "fcm",
              ptyp: "sys",
              uid: user.uid,
              vid: user.uid
            })
            sent = true;
          } else {         
            //TODO: AG Manage Failures, Triage              
            const reason = R.path(['results', '0', 'error'], results || {});                
            track({
              ename : "mfail",
              etyp: "fcm",
              ptyp: "sys",
              uid: user.uid,
              vid: user.uid,
              did : mdevice.did,
              error: reason
            })
            SysMessaging.prune(user.uid, mdevice);
          }           
          if (process.env.NODE_ENV == 'dev') debugSysMessage(`[FCM RESULT] ${JSON.stringify(results)}`)           
        });
      }
    } catch (ex) {
      try {
        nats.natsLogger.error({...comms, error: { code : '500', msg : 'Unknown error sending', ex}});
      } catch {}
      console.warn(ex);
      switch (ex.code) {
        case httpCodes.INTERNAL_SERVER_ERROR:
        default:
          throw ex; // Internal Server Error for uncaught exception
      }
    }
    return sent;
  }

  static async enlist(comms) {
    const db = new cxn();
    try {
      let user = (await db.client.execute(
        `select mdevices from users where uid=?`, [
        comms.user.uid
      ], {
        prepare: true
      })).first()

      if (!user) {
        nats.natsLogger.info({...comms, error: { code : '200', msg : 'Enlisting requires a real user.'}});
        return false;
      }

      if (!user.mdevices) user.mdevices = [];
      user.mdevices = user.mdevices.filter(device => device.did !== comms.obj.token);
      if (comms.obj.os === "ios") user.mdevices.splice(0, 0, { mtype: 'apn', did: comms.obj.token, updated: Date.now() })
      if (comms.obj.os === "android") user.mdevices.splice(0, 0, { mtype: 'fcm', did: comms.obj.token, updated: Date.now() })
      if (comms.obj.endpoint && comms.obj.keys) user.mdevices.splice(0, 0, { mtype: 'wpn', did: JSON.stringify(comms.obj), updated: Date.now() })

      if (!user.mdevices[0].did) throw { code : httpCodes.BAD_REQUEST, msg : 'Enlisting requires a real device.'}
      
      await db.client.execute(
        `update users set mdevices=? where uid=?`, [
        user.mdevices,
        comms.user.uid
      ], {
        prepare: true
      })

      return true;

    } catch (ex) {
      try {
        nats.natsLogger.error({...comms, error: { code : '500', msg : 'Unknown error enlisting user', ex}});
      } catch {}
      console.warn(ex);
      switch (ex.code) {
        case httpCodes.INTERNAL_SERVER_ERROR:
        default:
          throw ex; // Internal Server Error for uncaught exception
      }
    }
  }

  //Remove the mdevice from the user
  static async prune(uid, mdevice) {
    try {
      const db = new cxn();
      db.client.execute(
        `update users set mdevices = mdevices - ? where uid = ? ;`, [
        [mdevice],
        uid
      ], {
        prepare: true
      }).then(() => {
        track({
          ename : "pruned",
          etyp: "mdevice",
          ptyp: "sys",
          uid: uid,
          vid: uid,
          mdevice : JSON.stringify(mdevice),
        })
      }).catch(error => {
        console.warn(error);
        nats.natsLogger.error({...comms, error: { code : '500', msg : 'Unknown error pruning user', ex}});
      })
    } catch (ex) {
        try {
          nats.natsLogger.error({...comms, error: { code : '500', msg : 'Unknown error pruning user', ex}});
        } catch {}
        console.warn(ex);
        throw ex;
    }
  }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = SysMessaging;