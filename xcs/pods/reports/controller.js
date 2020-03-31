'use strict';

const Reports = require('./model');
const httpCodes = require('../../utils/httpStatusCodes')

class ReportsController {


    static async xasDbVersion(comms) {
        try {
            return await Reports.xasDbVersion(comms);            
        } catch (ex) {
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error getting db version."
            };            
            throw ex;
        }
    }


}


module.exports = ReportsController;