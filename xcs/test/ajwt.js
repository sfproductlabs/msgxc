var path = require('path');
var dotEnvPath = path.resolve('./.env.sfpl');
require('dotenv').config({ path: dotEnvPath});
const jws = require('jws');
const fs = require('fs');
var path = require("path");
const compression = require('../utils/compression')
const crypt = require('../utils/crypt')
const pubKey = fs.readFileSync(path.join(__dirname, '../.setup/keys/') + 'staging/pub.key', 'utf8');
const privKey = fs.readFileSync(path.join(__dirname, '../.setup/keys/') + 'staging/priv.key', 'utf8');
//const crypto = require('../crypt.json');
const ajwt = require('../utils/ajwt')

//console.log(crypto);
//Claims are stored with lz compression in cookie
const claims = {
	sso : {
		crypt : null,
		pub : {
			id : null,
			sid : null, //session_id
			method : null, //pwd or svc or magic-link
			by : null, //service name or user
			ip : null, 
			email : null,
			roles : [],
			dt : Date.now(),
		},
		exp : null, //Date.now() + ....
		sigs : {
			_ : null, //hash&sig all but this by owner/sso in this case
			other_claim : null //signature of hsig._ of other claim
		}
	}
};
const signature = jws.sign({
	  header: { alg: 'RS256' },
	  payload: JSON.stringify(claims),
	  secret: privKey,
});
//console.log(signature);

const verify = jws.verify(signature, 'RS256', pubKey);
//console.log(verify);

const decoded = jws.decode(signature,{
	  header: { alg: 'RS256' },
	  secret: privKey,
});
//console.log(decoded.payload)

//console.log(compression.decompress(crypt.decrypt(crypt.encrypt(compression.compress(JSON.stringify(claims)),'faraway'), 'faraway')))
// let x = crypt.encrypt(f.d,'faraway')
// fs.writeFile('ff.json', x , 'utf8',console.log);

console.log(JSON.stringify(ajwt.generateClaim(null, {uid : '14fb0860-b4bf-11e9-8971-7b80435315ac', roles : ['msgxc_admin'], method : 'svc', dt: Date.now(), by: 'manual'}, Date.now() + (1000 * 60 * 60 * 999))))