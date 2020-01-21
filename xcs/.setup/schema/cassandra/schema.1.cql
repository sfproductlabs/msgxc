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

create table users (
  uid         uuid,
  uname       text,
  pwd         text,
  uhash       text, --username hash
  email       text,
  ehash       text, --email hash
  org         uuid, --org member
  roles      set<text>,
  ref uuid, --referral
  aff text, --affiliate
  promo text, --promo code
  origin_url text,
  ip text,
  ips set<text>,
  params map<text,text>, --experiment params
  cohorts set<text>, --exp cohorts
  splits map<text,text>, --experimentid : splitid
  lang text,
  created timestamp,
  owner uuid, --org or person that owns this record
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
insert into sequences (name, seq) values('MSGXC_VER',1);

--INTERNAL & EXTERNAL SERVICES
create table services (
  svc    text,
  secret  text, --secret hash
  roles   set<text>,
  expiry date,
  created timestamp,
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
  updated timestamp,
  updater uuid,
  created timestamp,  
  owner uuid,
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
  owner uuid,
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

create table mxccerts (
  certid text,
  pub  text, --public key
  priv text, --private key
  algo text,
  org         uuid,
  created timestamp,
  owner uuid, 
  updated timestamp,
  updater uuid,
  PRIMARY KEY ((certid))
);

create table user_certs (
  certid       text,
  uid         uuid,
  primary key       (certid)
); 
CREATE INDEX user_certs_uid_idx ON user_certs ( uid );

create table group_certs (
  certid       text,
  gid         uuid, --group-id
  primary key       (certid)
); 
CREATE INDEX group_certs_gid_idx ON group_certs ( gid );

create table mxctriage (
  mxcid timeuuid,
  mtype text, --message type (ws - websocket,apn - apple push ios,fcm - firebase/android,webn - web notification,sms,em - email,emw - email weekly,emd - email daily, emm - email monthly)
  subject text,
  msg text,
  data text,
  template text, --use a url for now 
  certid text, --public key for encryption
  rel text, 
  ver int, --version
  schedule timestamp,
  started timestamp,
  completed timestamp,
  ptyp text, 
  auth text, --author
  xid text, --experiment id 
  gid uuid,
  users set<uuid>,
  deliveries set<uuid>, --uid delivered
  failures set<uuid>, --uid failures
  cohorts set<text>,
  split decimal, --% random 1=1%
  source text,
  medium text,
  campaign text,
  term text, 
  sink text,
  score double,
  promo text, --promo code to pass through
  ref uuid, --referrer uid (Select)
  aff text, --affiliate uname or code (Select)
  repl map<text,text>, --text to replace ex Hi {{fn}} -> becomes -> Hi Andrew, Prepend "text." to use Raw text instead of the user record Ex. {{text.msg}}. Only start off with one "text." message body in Admin UI (text.msg)
  --REQUEST OWNER
  app text, --app 
  svc text, --Ex. SES, 'message', 'sms, 'action'
  qid timeuuid, --executing queue id -- IMPORTANT !!!!
  srcid timeuuid, --source id Ex. message-id
  srckey text, --source id, audit id, inc. external Ex. SES message-id
  meta map<text,text>, --METADATA, SPLIT etc.
  keep boolean, --keep this message on the server
  org         uuid,
  createdms bigint,
  created timestamp,
  owner uuid,
  updated timestamp,
  updater uuid,
  PRIMARY KEY ((mxcid))
)
WITH default_time_to_live = 1209600; --Tombstones after 2 weeks

create type mxcdevice (
  mtype text,
  did text,
  updated timestamp
);

create table mxcfailures (
 mxcid timeuuid, --mxctriageid
 uid uuid,
 mtype text,
 mdevice frozen<mxcdevice>,
 failure text, --failure type (Ex. nopened, noack)
 retries int, 
 created timestamp,
 died timestamp, --stop retries
 owner uuid,
 updated timestamp,
 updater uuid,
 PRIMARY KEY ((mxcid), uid, mtype, mdevice)
);

alter table users add mdevices list<frozen<mxcdevice>>; --prioritized list of devices
alter table users add mtypes list<text>; --[mtype] prioritized list of preferences ~ => disabled
alter table users add mlast bigint; --last updated/looked at a mxc message
alter table users add cell text; 
alter table users add chash text; --cell hash 


-------------------END ENTIRELY NEW