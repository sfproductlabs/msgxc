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

class Threading {


  static async publish(comms) {
    const db = new cxn();
    try {
      let sent = false;
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

      let threadPerms = (await db.client.execute(
        `select owner,admins,opens,openp,perms,org from mthreads where tid=?`, [
        comms.tid
      ], {
        prepare: true
      })).first()

      if (!threadPerms) {
        return false;
      }

      if (threadPerms.perms) {
        let user = (await db.client.execute(
          `select roles,rights,org from users where uid=?`, [
          comms.user.uid
        ], {
          prepare: true
        })).first()

        if (!user) {
          return false;
        }
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

  static async unsubscribe(comms) {
    throw {code: httpCodes.NOT_IMPLEMENTED, msg: 'not implemented'}
  }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Threading;