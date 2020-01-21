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
```
{"msg":"the message to broadcast"}
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
```
{"msg":"the message to broadcast", "uids":["00000000-0000-0000-0000-000000000000"]}
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
```
{"msg":"the message to send", "uid":"14fb0860-b4bf-11e9-8971-7b80435315ac"}
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
```

**Correct Response:**
```true```

## TODO

- [ ] Processing in batches
