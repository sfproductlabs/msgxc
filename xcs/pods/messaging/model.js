/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Messaging model                                                                                */
/*                                                                                                */
/* All database calls go through the model.                                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const R = require('ramda');
const uuidv1 = require('uuid/v1');
const APN = require('../../utils/apn')
const FCM = require('../../utils/fcm')
//const sms = require('../../utils/sms')
const cxn = require('../../utils/cassandra');
const httpCodes = require('../../utils/httpStatusCodes')

class Messaging {

  static async broadcast(comms) {
    const db = new cxn();
    try {
      db.client.stream('SELECT * FROM users')
        .on('readable', function () {
          let row;
          // 'readable' is emitted as soon a row is received and parsed
          while (row = this.read()) {
            //TODO: AG MOVE TO BATCHING
            Messaging.send(comms, row)
          }
        })
        .on('end', function () {
          // Stream ended, there aren't any more rows
          return true;
        })
        .on('error', function (err) {
          // Something went wrong: err is a response error from Cassandra
          return false;
        });
    } catch (ex) {
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
    try {
      let sent = false;
      if (!user) {
        user = (await db.client.execute(
          `select * from users where uid=?`, [
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
        });

        const fcms = user.mdevices.filter(device => device.mtype === 'fcm');
        fcms.map(async mdevice => {
          const results = await FCM.send(mdevice.did, comms.obj.msg, comms.obj.opts);
          //TODO: AG Manage Failures, Triage            
        });
      }
    } catch (ex) {
      console.warn(ex);
      switch (ex.code) {
        case httpCodes.INTERNAL_SERVER_ERROR:
        default:
          throw ex; // Internal Server Error for uncaught exception
      }
    }
    return true;
  }

  static async subscribe(comms) {
    const db = new cxn();
    try {
      let user = (await db.client.execute(
        `select mdevices from users where uid=?`, [
        comms.user.uid
      ], {
        prepare: true
      })).first()

      if (!user) {
        return false;
      }

      if (!user.mdevices) user.mdevices = [];
      user.mdevices = user.mdevices.filter(device => device.did !== comms.obj.token);
      if (comms.obj.os === "ios") user.mdevices.splice(0, 0, { mtype: 'apn', did: comms.obj.token, updated: Date.now() })
      if (comms.obj.os === "android") user.mdevices.splice(0, 0, { mtype: 'fcm', did: comms.obj.token, updated: Date.now() })

      await db.client.execute(
        `update users set mdevices=? where uid=?`, [
        user.mdevices,
        comms.user.uid
      ], {
        prepare: true
      })

      return true;

    } catch (ex) {
      console.warn(ex);
      switch (ex.code) {
        case httpCodes.INTERNAL_SERVER_ERROR:
        default:
          throw ex; // Internal Server Error for uncaught exception
      }
    }
  }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Messaging;