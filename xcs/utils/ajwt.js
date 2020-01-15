// 
// Advanced Javascript Web-Tokens
// 
'use strict';

const crypto = require('crypto');
const jws = require('jws');
const fs = require('fs');
var path = require("path");
const R = require('ramda');

const pubKey = fs.readFileSync(process.env.AJWT_CERT, 'utf8');
const privKey = fs.readFileSync(process.env.AJWT_KEY, 'utf8');


//// Claims are stored with lz compression in cookie
//// The claims object consists of multiple single claims where the object-key
//// is the name of a common service with a verified public key.

//// A single claim should have the following internals
// const claimTemplate = {
//     crypt : null,
//     pub : {
//         id : null,
//         sid : null, //session_id
//         method : null, //pwd or svc or magic-link
//         by : null, //service name or user
//         ip : null, 
//         email : null,
//         roles : [],
//         dt : Date.now(),
//     },
//     exp : null, //Date.now() + ....
// }

//// Claims should be additive and constitute the following 
//// (For the sso service it should look like this), other services would add other keys other than sso
// const claims = {
// 	sso : {
//      ...claimTemplate,
// 		sigs : {
// 			_ : null, //hash&sig all but this by owner/sso in this case
// 		}
// 	}
// };

//See the claimTemplate definition above, this is the sigs._
const hash = (claim, key) => {
    delete claim.sigs;
    return crypto.createHmac('sha256', key || pubKey)
        .update(JSON.stringify(claim))
        .digest('hex');
}

const sign = (claim, key) => {
    delete claim.sigs;
    return jws.sign({
        header: { alg: 'RS256' },
        payload: JSON.stringify(claim),
        secret: key || privKey,
    });
}

const encrypt = (str, key) => {
    return jws.sign({
        header: { alg: 'RS256' },
        payload: str,
        secret: key || privKey,
    });
}

const decode = (encrypted) => {
    return jws.decode(encrypted, {
        header: { alg: 'RS256' },
        secret: privKey,
  });  
}

//See the claimTemplate definition above
const generateClaim = (privateInfo, publicInfo, expiry) => {
    let claim = {};
    claim.priv = (R.isNil(privateInfo) || R.isEmpty(privateInfo)) ? null :  sign(privateInfo);
    claim.pub = publicInfo;
    claim.exp = expiry || Date.now() + 1000 * 60 * 60 * 24; //Default is 24h
    claim.sigs = { _: { hash : hash(claim) } }; //We can verify ourselves only at this point
    claim.sigs._.sig = sign(claim.sigs._.hash);
    return claim;
}

const validateClaim = (claim, key) => {    
    let h1 = claim.sigs._.hash;
    let s1 = claim.sigs._.sig;
    delete claim.sigs;
    let h2 = hash(claim, key);
    if (h2 !== h1)
        return false;
    if (sign(h2,key) !== s1)
        return false;
    return true;
}

const verifyClaim = (claim, key) => {
    if (!jws.verify(claim.sigs._.sig || claim.priv, 'RS256', key || pubKey))
        return false;
}

const decodeClaim = (claim) => {
    claim.priv = decode(claim.priv);
    delete claim.sigs;
}

const addToClaims = (claims, claim) => {
    delete claims[process.env.APP_NAME];
    claims[process.env.APP_NAME] = claim;
    return claims;
}

module.exports = {
    encrypt,
    hash : hash,
    sign : sign,
    decode : decode,
    generateClaim : generateClaim,
    validateClaim : validateClaim,
    verifyClaim : verifyClaim,
    decodeClaim : decodeClaim,
    addToClaims : addToClaims
}

  