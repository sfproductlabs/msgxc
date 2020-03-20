# MSGXC XCS (Node.JS Service)

## Setup
* Create a directory pointer (ln -s) to this directory at /app/xcs, for me it's ```sudo ln -s /Users/username/msgxc/xcs /app/xcs```
* Update config files. /app/xcs/.env and /app/xcs/crypt.json
* Run ```npm start```

## A deeper look at the schema

### Current schema and tests
https://github.com/sfproductlabs/msgxc/tree/master/xcs/.setup/schema/cassandra

### Initial Schema
https://github.com/sfproductlabs/msgxc/blob/master/xcs/.setup/schema/cassandra/schema.1.cql

### Schema test data

https://github.com/sfproductlabs/msgxc/blob/master/xcs/.setup/schema/cassandra/data.1.test.cql

### Schema Specifics

#### mthread

A first class object in msgxc is a thread (mthread) and describes a conversation:
* subscribers (**subs*** message recipients)
* publishers (**pubs** message publishers)
* admins (thread managers)
* mtypes (messaging technologies/devices supported ex. sms, or websockets)
* prefs (user specific device preferences ex. only send me sms)

#### message (mstore & mtriage)

A message. Stored in triage (a message in the process of sending), or in the store (archive of messages). Contains the history of a message and the specifics including growth & tracking parameters (https://github.com/sfproductlabs/tracker).

