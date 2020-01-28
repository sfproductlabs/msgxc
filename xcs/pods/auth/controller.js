'use strict';

const compression = require('../../utils/compression')
const crypto = require('crypto')
const crypt = require('../../utils/crypt')
const ajwt = require('../../utils/ajwt')
const R = require('ramda');
const httpCodes = require('../../utils/httpStatusCodes')
const clientKey = process.env.CLIENT_SECRET || 'secret';
const ojwt = require('jsonwebtoken'); // JSON Web Token implementation

class AuthController {


    static authorizeUser(comms, jwt, level) {
        //basic jwt test
        if (typeof jwt !== 'string') {
            comms.error = {
                code: httpCodes.UNAUTHORIZED,
                msg: 'Authorization Failed (jwt)'
            };
            throw comms.error;
        }

        //Check for old jwt implementation
        let encrypted = false;
        try {
            jwt = JSON.parse(jwt);
        } catch {
            encrypted = true;
        }

        if (encrypted && process.env.APP_SECRET && process.env.APP_SECRET.length > 0) {
            try {
                const payload = ojwt.verify(jwt, process.env.APP_SECRET);
                AuthController.checkUserLevel(comms, R.defaultTo([])(R.path(['roles'], payload)), level)
                comms.user = payload;
                return;
            } catch (ex) {
                switch (ex.name) {
                    case ojwt.JsonWebTokenError.name:
                    case ojwt.NotBeforeError.name:
                    case ojwt.TokenExpiredError.name:
                        comms.error = {
                            code: httpCodes.UNAUTHORIZED,
                            msg: ex.message
                        };
                        throw comms.error;
                    default:
                        throw ex;
                        comms.error = {
                            code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                            msg: ex.msg || "Unknown server error authorizing."
                        };
                        throw comms.error;
                }
            }
        } else {
            // New jwt implementation
            try {
                if (!ajwt.validateClaim(jwt)) {
                    comms.error = {
                        code: httpCodes.UNAUTHORIZED,
                        msg: 'Authorization Failed (Claim)'
                    };
                    throw comms.error;
                }
                AuthController.checkUserLevel(comms, R.defaultTo([])(R.path(['pub', 'roles'], jwt)), level)
                comms.user = R.path(['pub'], jwt)
            } catch {
                comms.error = {
                    code: httpCodes.UNAUTHORIZED,
                    msg: 'Authorization Failed (Validate)'
                };
                throw comms.error;
            }
        }
    }

    static checkUserLevel(comms, roles, level) {
        if (level) {
            let found = false;
            const ls = level.toLowerCase().replace(/\s/g, '').split(',')
            for (let i = 0; i < ls.length; i ++) {
                if ((roles || []).some((f) => (f === ls[i]))) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                comms.error = {
                    code: httpCodes.UNAUTHORIZED,
                    msg: 'Authorization Failed (Role)'
                };
                throw comms.error;
            }
            
        }
    }

    static showClaims(claimsString) {
        return compression.decompress(crypt.decrypt(claimsString), clientKey);
    }

    static hideClaims(claims) {
        return crypt.encrypt(compression.compress(JSON.stringify(claims)), clientKey);
    }



}


module.exports = AuthController;