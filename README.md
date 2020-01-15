# Messaging Exchange and Event Bus for Node.js & Python

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

```
/api/v1/ping
```

Checks whether the server is up. 

**Correct Response:**
```200```



