'use strict';

const SysMessaging = require('./model');
const httpCodes = require('../../../utils/httpStatusCodes')

class SysMessageController {

    static async multicast(comms) {
        try {
            return await SysMessaging.multicast(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error multicasting."
            };
            throw comms.error;
        }
    }

    static async broadcast(comms) {
        try {
            return await SysMessaging.broadcast(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error broadcasting."
            };
            throw comms.error;
        }
    }

    static async send(comms) {
        try {
            return await SysMessaging.send(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error sending."
            };
            throw comms.error;
        }
    }

    static async enlist(comms) {
        try {
            return await SysMessaging.enlist(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error enlisting."
            };
            throw comms.error;
        }
    }


}


module.exports = SysMessageController;