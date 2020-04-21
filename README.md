# Messaging Exchange (MSGXC)

Multi-modal messaging inc. native push, websockets, web push, fcm, gcm, apn, sms, email with reports in Python & PySpark. Subsystem of the SFPL growth and experimentation framework.

## Design

Tracking messaging like we do the rest of internet traffic is essential to understanding our customers and optimizing growth. Messaging exchange (MSGXC) is a central system for dispatching and tracking (see https://github.com/sfproductlabs/tracker) all messgaing (currently supports iOS native, Android native, SMS, Email, Websockets, WebPush notifications). It is broken into 3 main components e**X**change **C**ommunication **S**ervice (xcs - node.js); e**X**change **A**nalysis **S**ervice (xas - pyspark); and e**X**change **S**cheduler **S**ervice (xss - python).

   | [XCS](https://github.com/sfproductlabs/msgxc/tree/master/xcs) | [XAS](https://github.com/sfproductlabs/msgxc/tree/master/xas) | [XSS](https://github.com/sfproductlabs/msgxc/tree/master/xss) |
   |---------------------------------------------------------------|:-----------------------------------------------------------------------:|:-----------------------------------------------------------------------:|
   | Dispatching messages (iOS,email etc.)                         | Experimentation and growth                                              | Manage experiment iterations and message dispatch                       |
   | Manage thread subscriptions                                   | Provide services to large complex queries using Spark, Hive, Elastic & Cassandra (Elassandra) |  Schedule system messages                      |

### Examples

* Native Android and iOS notifications https://github.com/sfproductlabs/msgxc/blob/master/examples/xcrn/push.js
* Websockets https://github.com/sfproductlabs/msgxc/blob/master/examples/xcwww/src/realtime/index.js
* Web Push Notifications https://github.com/sfproductlabs/msgxc/blob/6d12d44c7ff86e123844ea6c3062fb07304ac00c/examples/xcwww/src/serviceWorker.js#L61 & https://github.com/sfproductlabs/msgxc/blob/master/examples/xcwww/public/sw.js
* Email, SMS (work to your email/cell phone)

Using the schema https://github.com/sfproductlabs/msgxc/tree/master/xcs/.setup/schema/cassandra and example data https://github.com/sfproductlabs/msgxc/blob/master/xcs/.setup/schema/cassandra/data.1.test.cql  (see also https://github.com/sfproductlabs/msgxc/blob/master/xcs/README.md#a-deeper-look-at-the-schema).

### Admin UI

A rudimentary [administration user interface](https://github.com/sfproductlabs/msgxc/tree/master/admin) written (and extendable) in react is available for use. It's especially useful for testing and sending system messages.

### Quickstart

**Run dependencies**

```
docker-compose up
```

This will install Elassandra (Cassandra) and Nats, and initialize the database with the schema above.

**Setup**

Change the connection parameters to Google FCM/GCM, Sendgrid, Apple, Twilio, etc. and write your own .env file.
https://github.com/sfproductlabs/msgxc/blob/master/xcs/.env.sample

**Run the service**

Go into /xcs

```
npm start
```


### Components

* Realtime
  * Websockets
  * Web Notifications
  * Native Messaging
* Nearline
  * Email
  * SMS
* Routing
  * Handover to react-native-router (Universal Links/ App Link) 
* Acknowledgement
  * Web notification receipts
  * Websocket check-in (online time)
  * Native messaging receipts
* Offline
  * PySpark Reports
* Scheduler


### Urgency
   | Urgency      | Device State                | Example Application Scenario                 |
   |--------------|:---------------------------:|:--------------------------------------------:|
   | 1 - very-low | On power and wifi           | Advertisements                               |
   | 2 - low      | On either power or wifi     | Topic updates                                |
   | 3 - normal   | On neither power nor wifi   | Chat or Calendar Message                     |
   | 4 - high     | Low battery                 | Incoming phone call or time-sensitive alert  |


### Dependencies

Run ```docker-compose up``` in the root of this project to get elassandra (cassandra with elastic search), and NATS.io working.

## API

### User Functions

#### GETs

##### PING

```
/api/v2/ping
```

Checks whether the server is up. 

**Correct Response:**
```200```


#### POSTs

##### Enlist
_Requires Any JWT_
```
/api/v2/enlist
```

Enlists a user's devices including web-browsers, native android/os, to receive messages.

**Request body:**
```
{"os": "ios", "token": "ad62ea6ea23d6974871cf59a06cbdb2783b85adbafe3355c0007362249d3e75c"}

*or*

{"os": "android", "token": "e_nslPZejyM:APA91bHR-znf4EuSIKeY9dzlX4cupXA5cdsW1SzOHUFRrsteaL5WDuzsh_cnpVpQC3IPcewl_v3N0kbArC67UTEW_ENt5Ej5Sn0qi1RoRHv5beLNi9y4OzZ__T3SH3tW5gwqxn2Hap01"}

*or*

{
  endpoint: 'https://fcm.googleapis.com/fcm/send/czVGxJOoycA:APA91bGZt8FZU2fEAnDCr1PdRb7HDtayoGDUO1dy6vjTu1sDKhGAAB0i2nXw_jGKhnzmh5rmK4klsyaRQaUpM0oS0VYGBCTTpF-nkP67UEW7BX9o7vNatcPuiG-yHa75hXE80B5F7DNi',
  expirationTime: null,
  keys: {
    p256dh: 'BN81HfHxzt4V4lXDV_2ia8Rl_QvqofvoNI7_MOHCiOMEYuFXFNDBOJzKCCj2nzK5luwnH6rvBCN2jx7lNHpraaw',
    auth: '0ywNrBxQ-rm4skkHDJB5lw'
  }
}
```

**Correct Response:**
```true```

##### Publish
_Requires Any JWT_
```
/api/v2/publish
```

Publish a message to a thread (this sends a message to the mthread).

**Request body:**
```
{"tid": "5ae3c890-5e55-11ea-9283-4fa18a847130", "msg":"the message you want to send", "opts", { }}
```

**Correct Response:**
```true```


##### Subscribe
_Requires Any JWT_
```
/api/v2/subscribe
```

Subscribe a user to a thread (this adds a user to the subs column in mthreads).

**Request body:**
```
{"tid": "5ae3c890-5e55-11ea-9283-4fa18a847130"}
```

**Correct Response:**
```true```


##### Unubscribe
_Requires Any JWT_
```
/api/v2/unsubscribe
```

Unsubscribe a user from a thread (this removes a user from the subs column in mthreads).

**Request body:**
```
{"tid": "5ae3c890-5e55-11ea-9283-4fa18a847130"}
```

**Correct Response:**
```true```

### Admin Functions (without audting)

#### POSTs

##### BROADCAST
_Requires Admin JWT_
```
/api/v2/broadcast
```

Broadcasts a message to every user on the platform.

**Request body:**
msg _Required_
opts _Optional_
```
{"msg":"the message to broadcast", "opts": { "data": { "key": "whatever" }} }
```
**Correct Response:**
```true```

##### MULTICAST
_Requires Admin JWT_
```
/api/v2/multicast
```

Sends messages to selected UIDs (user-ids) on the platform.

**Request body:**
msg _Required_
uids _Required_
opts _Optional_
```
{"msg":"the message to broadcast", "uids":["00000000-0000-0000-0000-000000000000"], "opts": { "data": { "key": "whatever" }}}
```

**Correct Response:**
```true```

##### SEND
_Requires Admin JWT_
```
/api/v2/send
```

Sends a message to an individual.

**Request body:**
msg _Required_
uid _Required_
opts _Optional_
```
{"msg":"the message to send", "uid":"14fb0860-b4bf-11e9-8971-7b80435315ac", "opts": { "data": { "key": "whatever" }}}
```

**Correct Response:**
```true```

## Schema

https://github.com/sfproductlabs/msgxc/blob/master/xcs/README.md#a-deeper-look-at-the-schema

## Credits

Written in collaboration with the wonderful people...

## TODO
- [ ] Facebook Ads
- [ ] Google Ads
- [ ] Facebook Messenger
- [ ] LinkedIn
- [ ] Integrate with Apache Superset.
- [ ] Triage. Request -> Prioritization -> Triage (write [messageid/dateuuid, owner]; [owner, msgs], [option Realtime, Nearline, scheduled, failed], [tracking,capture,reporting,recall])
- [ ] Scheduler
- [ ] Processing in batches
- [ ] Multicast using elastic search (instead of slower CQL)
- [x] Add web notifications and SMS (Amazon/Twilio)
- [x] Add WebSocket
- [x] ~~Think about gRPC~~ waste of time
- [x] Add email fallback w/ templated options (inc. scheduling options)
- [ ] Add "last read" to each method, and ensure not sent in WebSocket first.
 
