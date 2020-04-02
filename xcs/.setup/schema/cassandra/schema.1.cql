-- To run:
-- cqlsh --ssl -f schema.1.cql 
-- Licensed under Apache-2.0.  Copyright (c) 2018 SF Product Labs. All Rights Reserved.
-- See LICENSE

-- SF Product Labs MSGXC Schema
--drop keyspace msgxc;
CREATE KEYSPACE msgxc WITH replication = {'class': 'NetworkTopologyStrategy', 'DC1': '1'}  AND durable_writes = true;

use msgxc;

--Merge with existing tables.

------------------------------ EXISTING START

create type address (
  fullname text,
  st1 text,
  st2 text,
  city text,
  province text,
  country text,
  zip text,
  active boolean,
  type text,
  phone text
);

create table orgs (
  org      uuid,
  parent   uuid,
  root uuid,
  lname text, --legal name
  hname text, --human name
  notes text,
  roles    set<text>,
  rights   set<text>,
  etype text, --entity type (legal)
  country  text,  
  lang text,
  hq address,
  addresses    map<text, frozen<address>>,
  created timestamp,
  owner uuid,
  updated timestamp,
  updater uuid,
  primary key (org)
);

create materialized view conglomerate as 
select * from orgs
where root is not null
primary key (root, org)
with clustering order by (root DESC, org ASC);

create table users (
  uid         uuid,
  uname       text,
  pwd         text,
  uhash       text, --username hash
  email       text,
  ehash       text, --email hash
  roles      set<text>,
  rights     set<text>,
  ref uuid, --referral
  aff text, --affiliate
  promo text, --promo code
  origin_url text,
  ip text,
  ips set<text>,
  params map<text,text>, --experiment params
  cohorts set<text>, --exp cohorts
  splits map<text,text>, --experimentid : split (xid_splitname)
  lang text,
  created timestamp,
  org uuid,
  owner uuid,
  updated timestamp,
  updater uuid,
  primary key       (uid)
);
CREATE INDEX user_cohorts_idx ON users ( cohorts );


--Used for update/creation only
create table user_emails (
  email       text,
  uid         uuid,
  primary key       (email)
); 
CREATE INDEX user_emails_uid_idx ON user_emails ( uid );

--Used for update/creation only
create table user_usernames (
  uname       text,
  uid         uuid,
  primary key       (uname)
);
CREATE INDEX user_usernames_uid_idx ON user_usernames ( uid );

create table sequences (
  name text,
  seq int,
  PRIMARY KEY (name)
);
insert into sequences (name, seq) values('MSGXC_VER',2);

--INTERNAL & EXTERNAL SERVICES
create table services (
  svc    text,
  secret  text, --secret hash
  roles   set<text>,
  rights  set<text>,
  expiry date,
  created timestamp,
  org uuid,
  owner uuid,
  updated timestamp,
  updater uuid,
  primary key       (svc)
);

--EVENTING
create table queues (
  svc text, --service origin
  qid timeuuid,
  qtype text, --source action/type Ex. sms
  sid timeuuid, --source id Ex. sms-id
  skey text, --source key (if not a uuid) like for cohorts: "name"
  ip text, --Requestor IP
  host text, --Host executing service
  schedule timestamp,
  started timestamp,
  completed timestamp,
  created timestamp,
  org uuid,
  owner uuid,
  updated timestamp,
  updater uuid,
  PRIMARY KEY ((qid))
)
WITH default_time_to_live = 1209600; --2 week Tombstones
CREATE INDEX queues_svc_idx ON queues ( svc );
CREATE INDEX queues_qtype_idx ON queues ( qtype );
CREATE INDEX queues_completed_idx ON queues ( completed );
CREATE INDEX queues_started_idx ON queues ( started );


--should never be updated
create table cohorts (
  cohort text,
  uids_url text,
  imported int, --successful imports (count)
  started timestamp,
  completed timestamp,
  created timestamp,
  org uuid,
  owner uuid,
  updated timestamp,
  updater uuid,
  PRIMARY KEY ((cohort))
);


--START NATS Specializations
--limit service usage
create table dailies (  
  ip inet, 
  day date,
  total counter,
  primary key((ip),day) 
)
WITH CLUSTERING ORDER BY (day DESC);

-- Esp. Server Debugging
create table counters (  
  id text,   
  total counter,
  primary key((id)) 
);

-- Esp. Server Debugging
create table logs (  
  id timeuuid,
  ldate date,
  created timestamp,
  ltime time, --nanosecond time for detailed server debugging
  topic text, 
  name text, 
  host text, 
  hostname text, 
  owner uuid,
  ip inet,
  level int, 
  msg text,
  params map<text,text>,
  primary key((id)) 
);


-- Esp. Server Debugging
create table updates (
  id text,
  updated timestamp,
  msg text,
  primary key(id)
);
--END NATS Specializations
------------------------------ EXISTING END


-------------------START ENTIRELY NEW

create type mcert (
  id timeuuid,
  name text,
  algo text, --ex ecc
  spec text, --ex 192spec2k1
  sz text, --serialization type (hex,num,json)
  opub  text, --asymmetric owner public key (der)
  opriv text, --OPTIONAL STORE asymmetric owner private key (hex)
  tpub text, --asymmetric thread public key
  tpriv text, --OPTIONAL STORE asymmetric thread private key
  sym text, --symmetric enc method (aes,rsa,elgamal)
  sver text, --version
  sspec text, --dhpubprivsha256
  skey text, --OPTIONAL symmetric/shared key
  dhpub text,
  dhpriv text, --OPTIONAL
  created timestamp,
  expires timestamp
);


--advanced permission (org and owner in everything else)
create type perm (
  org uuid,
  role uuid,
  right text,
  owner uuid,
  noun text,
  verb text,
  blk boolean --blacklist
);

--security audit table for join requests etc.
CREATE TABLE msec (
    tid timeuuid, --thread id    
    secid timeuuid, --uuid for this record
    perm frozen<perm>, 
    pending boolean,
    approver uuid,
    approved timestamp,
    created timestamp,
    org uuid,
    owner uuid,
    updatedms bigint, --participant updated CHECK
    updated timestamp,
    updater uuid,
    PRIMARY KEY ((tid), secid)
);
CREATE INDEX msec_pending_idx ON msec ( pending );

CREATE TABLE mthreads (
  --THREAD INFO
    tid timeuuid, --thread id
    alias text, --human identifier
    name text, --human readable name
    ddata text, --default data to send
    post text, --note/description of thread/post
    mtempl map<text, text>, --default template eg. {email,00001} --template text, --use a url for now
    mcert mcert,
    cats set<text>, --categories
    mtypes set<text>,  --message type (ws - websocket,apn - apple push ios,fcm - firebase/android,wpn - web push notification,sms,em - email,emw - email weekly,emd - email daily, emm - email monthly) 
    fmtypes set<text>, --  specific faluire / fallback mtypes (to override app defaults)
    cmtypes set<text>, --  specific mtypes for anything with a pmid (child messages, to override app defaults)
    urgency int,   
    sys boolean, --system message
    ephemeral int, --seconds until expiry (null == keep)
    archived boolean,
  --PERMISSIONS
    --Prioritized from most specific to most general >>>
    --Priority HIGH
    admins set<uuid>, --approve new members etc.
    --Priority MEDIUM
    opens boolean, --publicly subscribable, still add uid to subs [Default: false]
    openp boolean, --publicly publishable, still add uid to pubs [Default: false]
    --Priority LOW
    perms set<frozen<perm>>, --additional perms
  --TRACKING
    app text, --app 
    rel text, 
    ver int, --version
    ptyp text, 
    etyp text,
    ename text,
    auth text, --author
    xid text, --experiment id 
    cohorts set<text>,
    splits map<text,int>, --split=(xid_splitname) : number of participants
    source text,
    medium text,
    campaign text,
    term text, 
    promo text, --promo code to pass through
    ref uuid, --referrer uid (Select)
    aff text, --affiliate uname or code (Select)
  --RECIPIENTS
    broadcast boolean,
    derive boolean, --update subs based on cohorts/splits
    sent set<uuid>, --outstanding uids left to publish to for this experiment
    outs set<uuid>, --outstanding uids left to publish to for this experiment
    subs set<uuid>, --admins+writers+subs=subs (only this index required to subscribe)
    pubs set<uuid>, --uids who can publish to admins+pubs=pubs (only this index required to publish)
    prefs map<uuid, frozen<set<text>>>, --msg preferences (user,mtypes) apn,~,wpn etc.  
    ftrack boolean, --track failed deliveries
    strack boolean, --track successful deliveries
  --INTEREST
    interest map<text, int>, -- Ex. { attempted: 542, sent: 500, hearts : 44 , views : 55, clicks etc.}  
    perf map<text,double>, --Performance. {sink : score}
  --OWNER
    deleted timestamp,
    created timestamp,
    org uuid,
    owner uuid,
    updatedms bigint, --participant updated CHECK
    updated timestamp,
    updater uuid,
    PRIMARY KEY ((tid))
);

--TRIAGE
--Messages that are in the middle of being processed
--IF threadid==messageid = 1st Messsage!!!
create table mtriage (
  --MESSAGE
  tid timeuuid, --threadid
  mid timeuuid, --message id
  pmid timeuuid, --parent message id = CHILD
  subject text,
  msg text, --text
  data text, --json
  urgency int,  
  sys boolean, --system message 
  broadcast boolean,
  mtempl text, --use a url for now (see mthreads)
  repl map<text,text>, --text to replace ex Hi {{fn}} -> becomes -> Hi Andrew, Prepend "text." to use Raw text instead of the user record Ex. {{text.msg}}. Only start off with one "text." message body in Admin UI (text.msg)
  --SCHEDULE
  svc text, --Ex. SES, 'message', 'sms, 'action'
  qid timeuuid, --executing queue id -- IMPORTANT !!!!
  rid uuid, --Relation id id Ex. message-id
  relation text, --Relation source audit id, inc. external Ex. xcs.mthread
  meta map<text,text>, --METADATA, SPLIT etc.
  scheduled timestamp,
  started timestamp,
  completed timestamp,
  --AUDITING
  mtypes set<text>, --attempted mtypes (update after actually sent)
  users set<uuid>, --keep this here for pull mid > lastloggedin
  deliveries set<uuid>, --uid delivered, update after ACK of wsocket
  failures set<uuid>, --uid failures
  --TRACKING
  xid text,
  split text,
  --PERMISSIONS
  perms set<frozen<perm>>, --additional perms 
  --OWNERSHIP
  deleted timestamp,
  keep boolean, --keep this message on the server
  createdms bigint, --INDEX and use this for last-seen & alerts ALONGWITH users
  created timestamp,
  org uuid,
  owner uuid,
  updated timestamp,
  updater uuid,
  PRIMARY KEY ((tid), mid)
)
WITH CLUSTERING ORDER BY (mid DESC)
AND default_time_to_live = 3628800 --Tombstones after 6 weeks
AND GC_GRACE_SECONDS = 3600; --Force regular tombstone clearouts


--PERMANENT ARCHIVE
--Store for messages that have been scheduled or sent
--IF threadid==messageid = 1st Messsage!!!
create table mstore (
  --MESSAGE
  tid timeuuid, --threadid
  mid timeuuid, --message id
  pmid timeuuid, --parent message id = CHILD
  subject text,
  msg text, --text
  data text, --json
  urgency int,  
  sys boolean, --system message 
  broadcast boolean,
  mtempl text, --use a url for now (see mthreads)
  repl map<text,text>, --text to replace ex Hi {{fn}} -> becomes -> Hi Andrew, Prepend "text." to use Raw text instead of the user record Ex. {{text.msg}}. Only start off with one "text." message body in Admin UI (text.msg)
  --SCHEDULE
  svc text, --Ex. SES, 'message', 'sms, 'action'
  qid timeuuid, --executing queue id -- IMPORTANT !!!!
  rid uuid, --Relation id id Ex. message-id
  relation text, --Relation source audit id, inc. external Ex. xcs.mthread
  meta map<text,text>, --METADATA etc.
  planned timestamp,
  scheduled timestamp, --scheduled is removed once processed to limit index size
  started timestamp,
  completed timestamp,
  --AUDITING
  mtypes set<text>, --attempted mtypes (update after actually sent)
  users set<uuid>, --keep this here for pull mid > lastloggedin
  deliveries set<uuid>, --uid delivered, update after ACK of wsocket
  failures set<uuid>, --uid failures
  --TRACKING
  xid text,
  split text,
  --PERMISSIONS
  perms set<frozen<perm>>, --additional perms 
  --OWNERSHIP
  deleted timestamp,
  keep boolean, --keep this message on the server
  createdms bigint, --INDEX and use this for last-seen & alerts ALONGWITH users
  created timestamp,
  org uuid,
  owner uuid,
  updated timestamp,
  updater uuid, 
  --ADDITIONAL FIELDS
  interest map<text, int>, -- Ex. { attempted: 542, sent: 500, hearts : 44 , views : 55, clicks etc.} 
  perf map<text,double>, --Performance. {sink : score}
  hide timestamp, --use ephemeral value in thread
  hidden boolean, --REQUIRED: set to false
  PRIMARY KEY ((tid), mid)
)
WITH CLUSTERING ORDER BY (mid DESC);
CREATE INDEX mstore_scheduled_idx ON mstore ( scheduled ); --Make scheduled null once processed

create type mdevice (
  mtype text,
  did text,
  updated timestamp
);

create table mfailures (
 tid timeuuid,
 mid timeuuid, --mtriageid
 uid uuid,
 mtype text,
 mdevice frozen<mdevice>,
 failure text, --failure type (Ex. nopened, noack)
 retries int, 
 died timestamp, --stop retries
 created timestamp,
 org uuid,
 owner uuid,
 updated timestamp,
 updater uuid,
 PRIMARY KEY ((tid), mid, uid, mtype, mdevice)
)
WITH CLUSTERING ORDER BY (mid DESC);

alter table users add mdevices list<frozen<mdevice>>; --prioritized list of devices
alter table users add mtypes list<text>; --[mtype] prioritized list of preferences ~ => disabled
alter table users add mlast bigint; --(ms) last updated/looked at a mxc messages
alter table users add cell text; 
alter table users add chash text; --cell hash 
alter table users add mcerts set<frozen<mcert>>; 

-------------------END ENTIRELY NEW
