'use strict';

const compression = require('../../utils/compression')
const crypto = require('crypto')
const crypt = require('../../utils/crypt')
const ajwt = require('../../utils/ajwt')
const R = require('ramda');
const httpCodes = require('../../utils/httpStatusCodes')
const clientKey = process.env.CLIENT_SECRET || 'secret';


class AuthController {


    static authorizeUser(comms, jwt, level) {
        if (!ajwt.validateClaim(jwt)) {
            comms.error = {
                code: httpCodes.UNAUTHORIZED,
                msg: 'Authorization Failed (Claim)'
            };
            throw comms.error;
        }
        if (level) {
            if (!R.defaultTo([])(R.path(['pub', 'roles'], jwt)).some((f) => (f === level))) {
                comms.error = {
                    code: httpCodes.UNAUTHORIZED,
                    msg: 'Authorization Failed (Role)'
                };
                throw comms.error;
            }
        }
        comms.user = R.path(['pub'], jwt)
        
    }


    static showClaims(claimsString) {
        return compression.decompress(crypt.decrypt(claimsString), clientKey);
    }

    static hideClaims(claims) {
        return crypt.encrypt(compression.compress(JSON.stringify(claims)), clientKey);
    }



}


module.exports = AuthController;