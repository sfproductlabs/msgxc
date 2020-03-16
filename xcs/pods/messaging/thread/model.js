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

const AuthController = require('../../auth/controller');

class Threading {


  static async publish(comms) {
    const db = new cxn();
    try {
      if (!comms.user || !comms.obj.tid) {
        return false;
      }

      let thread = (await db.client.execute(
        `select owner,admins,openp,perms,org,pubs,prefs from mthreads where tid=?`, [
        comms.obj.tid
      ], {
        prepare: true
      })).first()
      
      if (!thread) {
        return false;
      }

      let checked = false;
      if (comms.user.method === 'svc') {
        checked = true;
      } else if (comms.user.uid) {
        
      }

      

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

      if (!comms.user || !comms.user.uid || !comms.obj.tid) {
        return false;
      }

      let threadPerms = (await db.client.execute(
        `select owner,admins,opens,openp,perms,org from mthreads where tid=?`, [
        comms.obj.tid
      ], {
        prepare: true
      })).first()
      if (!threadPerms) {
        return false;
      }

      let checked = false;
      if (threadPerms.perms) {
        checked = AuthController.checkPerms(comms, threadPerms.perms, 'thread', 'subscribe');
      } 
      
      let isOwner = false, isAdmin = false;
      if (!checked) {
        isOwner = threadPerms.owner.toString() === comms.user.uid;
        isAdmin = threadPerms.admins && threadPerms.admins.some(f=> f.toString() === comms.user.uid);  
      }
      
      if (checked || isOwner || isAdmin || threadPerms.opens || threadPerms.openp) {

        await db.client.execute(
          `update mthreads set subs=subs+? where tid=?`, [
          [comms.user.uid],
          comms.obj.tid
        ], {
          prepare: true
        })

        return true;
      } else {
        return false;
      }

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
    const db = new cxn();
    try {

      if (!comms.user || !comms.user.uid || !comms.obj.tid) {
        return false;
      }

      await db.client.execute(
        `update mthreads set subs=subs-?, prefs=prefs-? where tid=?`, [
        [comms.user.uid],
        [comms.user.uid],
        comms.obj.tid
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

module.exports = Threading;