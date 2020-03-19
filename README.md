# Messaging Exchange and Event Bus for Node.js & Python

### &#x1F534; Important &#x1F534;
```diff
- This project is a work in progress. Please come back shortly.
```
## Design

Request -> Prioritization -> Triage (write [messageid/dateuuid, owner]; [owner, msgs], [option Realtime, Nearline, scheduled, failed], [capture,reporting,recall])

### Components

* Realtime
  * Websockets (Socket.io, uWebSockets)
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

### API

#### GETs

##### PING

```
/api/v1/ping
```

Checks whether the server is up. 

**Correct Response:**
```200```


#### POSTs

##### BROADCAST
_Requires Admin JWT_
```
/api/v1/broadcast
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
/api/v1/multicast
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
_Requires Any JWT_
```
/api/v1/send
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

##### SUBSCRIBE-NATIVE
_Requires Any JWT_
```
/api/v1/native/subscribe
```

Subscribes a user to native messaging using their current device.

**Request body:**
```
{"os": "ios", "token": "ad62ea6ea23d6974871cf59a06cbdb2783b85adbafe3355c0007362249d3e75c"}

or

{"os": "android", "token": "e_nslPZejyM:APA91bHR-znf4EuSIKeY9dzlX4cupXA5cdsW1SzOHUFRrsteaL5WDuzsh_cnpVpQC3IPcewl_v3N0kbArC67UTEW_ENt5Ej5Sn0qi1RoRHv5beLNi9y4OzZ__T3SH3tW5gwqxn2Hap01"}

or

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

## TODO

- [ ] Processing in batches
- [ ] Multicast using elastic search (instead of slower CQL)
- [x] Add web notifications and SMS (Amazon/Twilio)
- [x] Add WebSocket
- [x] ~~Think about gRPC~~ waste of time
- [x] Add email fallback w/ templated options (inc. scheduling options)
- [ ] Add "last read" to each method, and ensure not sent in WebSocket first.
