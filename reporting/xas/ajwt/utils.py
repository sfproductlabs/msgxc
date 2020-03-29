import json 
import hmac
import hashlib 
import binascii
from jose import jwk, jwt, jws

def hm(message, key):
    #byte_key = binascii.unhexlify(key)
    #message = message.encode()
    return hmac.new(str.encode(key), message.encode(), hashlib.sha256).hexdigest()

def hash(message):
    return hashlib.sha256(str.encode(message)).hexdigest()

def version():
    return 2

def checkUserLevel(token,claims):
    return True

def decode(token, secret=None, privkey=None, pubkey=None, algorithms=['RS256','HS256']):
    decoded = None
    try:
        js = json.loads(token)
    except ValueError as err:
        options = {
        'verify_signature': False, #We don't need to verify as its symmetric
        'verify_exp': True,
        'verify_nbf': False,
        'verify_iat': True,
        'verify_aud': False
        }
        try:
            #Version 1            
            return jwt.decode(token, secret, algorithms=algorithms, options=options)
        except Exception as err:
            print(err)
            raise err
    else:
        # Version 2
        copy = json.loads(token)
        del copy['sigs']
        if hm(json.dumps(copy,separators=(',', ':')),pubkey) != js['sigs']['_']['hash']:
            raise Exception('hash mismatch')
        private_key = jwk.construct(privkey, "RS256").to_dict()
        public_key = jwk.construct(pubkey, "RS256").to_dict()
        sig = jws.verify(js['sigs']['_']['sig'], public_key, algorithms, verify=True)
        if js['priv'] != None:
            js['priv'] = json.loads(jws.verify(js['priv'], public_key, algorithms, verify=False))
        if str(sig,'utf-8').replace('"',"") != js['sigs']['_']['hash']:
            raise Exception('bad sig')
        return js

    
