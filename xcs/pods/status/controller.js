'use strict';

const Status = require('./model');
const httpCodes = require('../../utils/httpStatusCodes')

class StatusController {


    static async getDbVersion(comms) {
        try {
            return await Status.getDbVersion();            
        } catch (ex) {
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error getting db version."
            };            
            throw ex;
        }
    }


}


module.exports = StatusController;