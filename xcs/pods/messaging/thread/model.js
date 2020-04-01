/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Messaging model                                                                                */
/*                                                                                                */
/* All database calls go through the model.                                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const R = require('ramda');
const uuidv1 = require('uuid/v1');
const { broadcastServers } = require('../../realtime/nats')
const APN = require('../../../utils/apn')
const FCM = require('../../../utils/fcm')
const WPN = require('../../../utils/wpn')
const SMS = require('../../../utils/sms')
const EMAIL = require('../../../utils/sendgrid')
const cxn = require('../../../utils/cassandra');
const httpCodes = require('../../../utils/httpStatusCodes')
const AuthController = require('../../auth/controller');
const debugThread = require('debug')('thread')

class Threading {

  static async send(message, thread=null, refetch=false) {
    const db = new cxn();
    const now = Date.now();
    const tid = R.path(['tid'],thread) || R.path(['tid'],message);
    const mid = R.path(['mid'],message);

    if (!tid || !mid) {
      debugThread('Missing tid/mid')
      return false;
    }

    if (!thread || refetch) {
      //Load the thread again
      thread = (await db.client.execute(
        `select tid,broadcast,owner,admins,openp,perms,org,pubs,prefs,subs,mtypes,alias,name from mthreads where tid=?`, [
        tid
      ], {
        prepare: true
      })).first()
    }
    if (!thread || !thread.tid) {
      debugThread('Could not load thread during send')
      return false;
    }

    if (!message || !message.msg || refetch) {
      //Load the message
      message = (await db.client.execute(
        `select * from mstore where tid=? and mid=?`, [ //TODO: clean up what's needed
        tid,
        mid
      ], {
        prepare: true
      })).first()
    }

    if (!message || !message.tid || !message.mid || !message.msg) {
      debugThread('Could not load message during send')
      return false;
    }

    message.opts = message.opts || R.tryCatch(JSON.parse, (_, value) => (value))(message.data);

    //////////////////////////
    //SEND BROADCASTS
    //WS (WebSocket) - Publish to any subscribers      
    if (!thread.mtypes || thread.mtypes.includes('ws')) {
      broadcastServers(`thread.${message.tid}`, {
        sender: { uid: message.owner, sys: message.sys },
        msg: message.msg,
        opts: message.opts
      });
      //TODO: AG Manage ACK, Failures, Triage
    }

    if (thread.broadcast) {
      throw { code: httpCodes.NOT_IMPLEMENTED, msg: 'Not Implemented' }
    } else if (thread.subs) {
      const notified = [];
      //Send to subscribers (subs)
      for (let i = 0; i < thread.subs.length; i++) {
        let sent = false;

        //First check thread.prefs and user.mtypes and thread.mtypes
        let sendTypes = thread.mtypes ? thread.mtypes.slice() : null; //null means sendall

        //Check the thread specific user preferences
        if (thread.prefs) {
          const userThreadPrefs = thread.prefs[thread.subs[i]];
          if (userThreadPrefs) {
            if (userThreadPrefs.includes('~')) {
              continue;
            }
            sendTypes = sendTypes ? sendTypes.filter(v => userThreadPrefs.includes(v)) : userThreadPrefs.slice();
          }
        }

        //Check the user
        let user = (await db.client.execute(
          `select cell,uid,mtypes,mdevices,email from users where uid=?`, [
          thread.subs[i]
        ], {
          prepare: true
        })).first()
        if (user.mtypes) {
          if (user.mtypes.includes('~')) {
            continue;
          }
          sendTypes = sendTypes ? sendTypes.filter(v => user.mtypes.includes(v)) : user.mtypes.slice();
        }


        //////////////////////////
        //SEND OTHERS
        //TODO: Triage!
        //TODO: Add retries for realtime
        //TODO: ScheduleDegraded() and include nearline messaging emd, emm , emw (email summaries)
        notified.push(thread.subs[i]);
        if (user.mdevices) {
          //APN
          if (!sendTypes || sendTypes.includes('apn')) {
            const apns = user.mdevices.filter(device => device.mtype === 'apn');
            apns.map(async mdevice => {
              const results = await APN.send(mdevice.did, message.msg, message.opts);
              //TODO: AG Manage Failures, Triage             
            });
          }
          //FCM
          if (!sendTypes || sendTypes.includes('fcm')) {
            const fcms = user.mdevices.filter(device => device.mtype === 'fcm');
            fcms.map(async mdevice => {
              const results = await FCM.send(mdevice.did, message.msg, message.opts);
              //TODO: AG Manage Failures, Triage            
            });
          }
          //WPN
          if (!sendTypes || sendTypes.includes('wpn')) {
            const wpns = user.mdevices.filter(device => device.mtype === 'wpn');
            wpns.map(async mdevice => {
              const result = await WPN.send(mdevice.did, { ...message.opts, msg: message.msg, ok: true, slug: `/thread/${message.tid}` });
              if (!result) {
                db.client.execute(
                  `update users set mdevices = mdevices - ? where uid = ? ;`, [
                  [mdevice],
                  thread.subs[i]
                ], {
                  prepare: true
                }).catch(error => {
                  console.error(error);
                })
              }
              //TODO: AG Manage Failures, Triage            
            });
          }


        }

        //SMS
        if (user.cell && (!sendTypes || sendTypes.includes('sms'))) {
          SMS.send(user.cell, message.msg);
          //TODO: AG Manage Failures, Triage 
        }

        //EMAIL
        if (user.email && (!sendTypes || sendTypes.includes('em'))) {
          EMAIL.send({ to: user.email, subject: `New message in thread ${thread.name || thread.alias}`, text: message.msg });
          //TODO: AG Manage Failures, Triage 
        }
      }

      debugThread(`Successfully sent message ${tid}.${mid}`)

      const completed = Date.now();
      
      //SEAL MESSAGE      
      await db.client.execute(
        `update mstore set scheduled=?, started=?, completed=?,updated=? where tid=? and mid=?`, [
        null,
        now,
        completed,
        completed,
        tid,
        mid
      ], {
        prepare: true
      })

      //TODO: SETUP TRAIGE

      return true;

    } else {
      return false;
    }
  }


  static async execute(comms) {
    try {

      //TODO: cancel only supports messages (mid) atm
      if (!comms.obj.tid || !comms.obj.mid) {
        debugThread(`Missing parameters in request`)
        return false;
      }

      return await Threading.send(comms.obj)

    } catch (ex) {
      console.warn(ex);
      switch (ex.code) {
        case httpCodes.INTERNAL_SERVER_ERROR:
        default:
          throw ex; // Internal Server Error for uncaught exception
      }
    }
  }

  static async publish(comms) {
    const db = new cxn();
    const now = Date.now();
    try {
      if (!comms.user || !comms.obj.tid || !comms.obj.msg || comms.obj.msg.length < 2) {
        debugThread(`Missing parameters in request`)
        return false;
      }

      let thread = (await db.client.execute(
        `select broadcast,owner,admins,openp,perms,org,pubs,prefs,subs,mtypes,alias,name from mthreads where tid=?`, [
        comms.obj.tid
      ], {
        prepare: true
      })).first()

      if (!thread) {
        debugThread(`Missing thread`)
        return false;
      }

      //Check the thread
      if (thread.mtypes && thread.mtypes.find(e => e == "~")) {
        debugThread(`Thread disabled`)
        return true; //We can use this to temporarily disable the thread notifications.
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

      //Update message properties based on rules
      comms.obj.sys = thread.sys && comms.obj.sys && !comms.obj.pmid;
      comms.obj.subject = comms.obj.subject || thread.name;
      comms.obj.data = typeof comms.obj.opts === 'string' ? comms.obj.opts : typeof comms.obj.opts === 'object' ? JSON.stringify(comms.obj.opts) : null
      comms.obj.broadcast = thread.broadcast && comms.obj.broadcast && !comms.obj.pmid
      //TODO: Persist to the MSTORE
      const mid = uuidv1();
      await db.client.execute(
        `insert into mstore (
            tid,         
            mid,
            pmid,
            subject,
            sys,
            broadcast,
            scheduled,
            msg,
            data,
            createdms,

            created,
            planned,
            org,
            owner,
            updated,
            updater
          ) values (
            ?,?,?,?,?,?,?,?,?,? ,?,?,?,?,?,?
          )`, [
        comms.obj.tid,
        mid,
        comms.obj.pmid,
        comms.obj.subject,
        comms.obj.sys,
        comms.obj.broadcast,
        comms.obj.scheduled,
        comms.obj.msg,
        comms.obj.data,
        now,
        now,

        comms.obj.scheduled,
        undefined,
        comms.user.uid,
        now,
        comms.user.uid
      ], {
        prepare: true
      });

      //Check if scheduled for later
      if (comms.obj.scheduled && new Date(comms.obj.scheduled).getTime() > now) {
        debugThread(`Postponing message via schedule`)
        return true;
      }

      return await Threading.send(comms.obj, thread, false)

    } catch (ex) {
      console.warn(ex);
      switch (ex.code) {
        case httpCodes.INTERNAL_SERVER_ERROR:
        default:
          throw ex; // Internal Server Error for uncaught exception
      }
    }
  }

  static async subscribe(comms) {
    const db = new cxn();
    try {

      if (!comms.user || !comms.user.uid || !comms.obj.tid) {
        debugThread(`Missing parameters in request`)
        return false;
      }

      let threadPerms = (await db.client.execute(
        `select owner,admins,opens,openp,perms,org from mthreads where tid=?`, [
        comms.obj.tid
      ], {
        prepare: true
      })).first()
      if (!threadPerms) {
        debugThread(`Missing thread`)
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
        debugThread(`Missing parameters in request`)
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

  static async cancel(comms) {
    const db = new cxn();
    const now = Date.now();
    try {

      //TODO: cancel only supports messages (mid) atm
      if (!comms.user || !comms.user.uid || !comms.obj.tid || !comms.obj.mid) {
        debugThread(`Missing parameters in request`)
        return false;
      }

      await db.client.execute(
        `update mstore set scheduled=?,completed=?,updated=?,meta+=? where tid=? and mid=?`, [
        null,
        now,
        now,
        { "canceled": new Date().toISOString() },
        comms.obj.tid,
        comms.obj.mid
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