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
        `select broadcast,owner,admins,openp,perms,org,pubs,prefs,subs,mtypes from mthreads where tid=?`, [
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
        checked = threadPerms.openp;
        if (!checked) {
          checked = threadPerms.owner.toString() === comms.user.uid;
        }
        if (!checked) {
          checked = threadPerms.admins && threadPerms.admins.some(f => f.toString() === comms.user.uid);
        }
        if (!checked) {
          checked = threadPerms.pubs && threadPerms.pubs.some(f => f.toString() === comms.user.uid);
        }
        if (threadPerms.perms) {
          checked = AuthController.checkPerms(comms, threadPerms.perms, 'thread', 'subscribe');
        }
      }

      if (!checked) {
        return false;
      }

      if (thread.broadcast) {
        throw { code: httpCodes.NOT_IMPLEMENTED, msg: 'Not Implemented' }
      } else if (thread.subs) {
        const notified = [];
        //Send to subscribers (subs)
        for (let i = 0; i < thread.subs.length; i++) {
          let sent = false;

          //////////////////////////
          //First check thread.prefs and user.mtypes and thread.mtypes

          //Check the thread
          let sendTypes = thread.mtypes ? thread.mtypes.slice() : null; //null means sendall
          if (thread.mtypes && thread.mtypes.find(e => e == "~")) {
            continue; //We can use this to temporarily disable the thread notifications.
          }

          //Check the thread specific user preferences
          if (thread.prefs) {
            const userThreadPrefs = thread.prefs[thread.subs[i]];
            if (userThreadPrefs) {
              if (userThreadPrefs.find(e => e == "~")) {
                continue;
              }
              sendTypes = sendTypes ? sendTypes.filter(v => userThreadPrefs.includes(v)) : userThreadPrefs.slice();
            }
          }

          //Check the user
          let user = (await db.client.execute(
            `select uid,mtypes,mdevices from users where uid=?`, [
            thread.subs[i]
          ], {
            prepare: true
          })).first()
          if (user.mtypes) {
            if (user.mtypes.find(e => e == "~")) {
              continue;
            }
            sendTypes = sendTypes ? sendTypes.filter(v => user.mtypes.includes(v)) : user.mtypes.slice();
          }


          //////////////////////////
          //SEND
          //TODO: Add other realtime message types Ex. SMS, Email, WS, WebNotifications
          //TODO: Add retries for realtime
          //TODO: ScheduleDegraded() and include nearline messaging emd, emm , emw (email summaries)
          notified.push(thread.subs[i]);
          if (user.mdevices) {
            //APN
            if (!sendTypes || sendTypes.find(e => e == "apn")) {
              const apns = user.mdevices.filter(device => device.mtype === 'apn');
              apns.map(async mdevice => {
                const results = await APN.send(mdevice.did, comms.obj.msg, comms.obj.opts);
                //TODO: AG Manage Failures, Triage             
              });
            }
            //FCM
            if (!sendTypes || sendTypes.find(e => e == "fcm")) {
              const fcms = user.mdevices.filter(device => device.mtype === 'fcm');
              fcms.map(async mdevice => {
                const results = await FCM.send(mdevice.did, comms.obj.msg, comms.obj.opts);
                //TODO: AG Manage Failures, Triage            
              });
            }
          }
        }
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

  static async canSubscribe(comms) {
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
      isAdmin = threadPerms.admins && threadPerms.admins.some(f => f.toString() === comms.user.uid);
    }

    if (checked || isOwner || isAdmin || threadPerms.opens || threadPerms.openp) {
      return true;
    } else {
      return false;
    }
  }

  static async subscribe(comms) {
    const db = new cxn();
    try {

      if (await Threading.canSubscribe(comms)) {
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