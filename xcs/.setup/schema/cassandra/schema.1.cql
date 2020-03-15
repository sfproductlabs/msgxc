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
  rights     set<text>,
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
  rights  set<text>,
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

CREATE TABLE mthreads (
    --THREAD INFO
    tid timeuuid, --thread id
    alias text,
    mcert mcert,
    mtypes set<text>,  --message type (ws - websocket,apn - apple push ios,fcm - firebase/android,webn - web notification,sms,em - email,emw - email weekly,emd - email daily, emm - email monthly) 
    mtempl map<text, text>, --default template eg. {email,00001} --template text, --use a url for now
    fmtypes set<text>, --  specific faluire / fallback mtypes (to override app defaults)
    cats set<text>, --categories   
    ephemeral int, --seconds until expiry (null == keep)
    archived boolean,
    --PERMISSIONS
    opens boolean, --publicly subscribable, still add uid to subs [Default: false]
    openp boolean, --publicly publishable, still add uid to pubs [Default: false]
    admins set<uuid>, --approve new members etc.
    approved timestamp,
    approver uuid,
    max_users int,
    --ADVANCED PERMISSIONS
    aperms boolean, --use advanced perms (true to use)
    rperms map<text, frozen<set<text>>>, -- detail role permissions {"post", "admin" } etc. 
    dperms map<text, frozen<set<text>>>, -- detail usage rights {"post", "writers,managers" } etc. 
    uperms map<uuid, frozen<set<text>>>, -- user permissions {00000-00000-00000-000000000, "join,post" } etc. 
    --RECIPIENTS
    subs set<uuid>, --null = broadcast, admins+writers+subs=subs (only this index required to subscribe)
    pubs set<uuid>, --uids who can publish to admins+pubs=pubs (only this index required to publish)
    prefs map<uuid, frozen<set<text>>>, --msg preferences (user,mtypes) apn,~,webn etc.    
    --OWNER
    org         uuid,
    created timestamp,
    owner uuid,
    updated timestamp,
    updater uuid,
    PRIMARY KEY ((tid))
);

create table mtriage (
  mid timeuuid, --message id
  tid timeuuid, --threadid
  subject text,
  msg text,
  data text,
  template text, --use a url for now 
  rel text, 
  ver int, --version
  schedule timestamp,
  started timestamp,
  completed timestamp,
  ptyp text, 
  auth text, --author
  xid text, --experiment id 
  mtypes set<text>, --attempted mtypes (update after actually sent)
  users set<uuid>, --keep this here for pull mid > lastloggedin
  deliveries set<uuid>, --uid delivered, update after ACK of wsocket
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
  PRIMARY KEY (mid)
)
WITH default_time_to_live = 1209600; --Tombstones after 2 weeks

create type mdevice (
  mtype text,
  did text,
  updated timestamp
);

create table mfailures (
 mid timeuuid, --mtriageid
 uid uuid,
 mtype text,
 mdevice frozen<mdevice>,
 failure text, --failure type (Ex. nopened, noack)
 retries int, 
 created timestamp,
 died timestamp, --stop retries
 owner uuid,
 updated timestamp,
 updater uuid,
 PRIMARY KEY ((mid), uid, mtype, mdevice)
);

alter table users add mdevices list<frozen<mdevice>>; --prioritized list of devices
alter table users add mtypes list<text>; --[mtype] prioritized list of preferences ~ => disabled
alter table users add mlast bigint; --(ms) last updated/looked at a mxc message
alter table users add cell text; 
alter table users add chash text; --cell hash 
alter table users add mcerts set<frozen<mcert>>; 

-------------------END ENTIRELY NEW

--TODO
--marchive