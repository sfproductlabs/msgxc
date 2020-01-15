-- To run:
-- cqlsh --ssl -f schema.1.cql 
-- Licensed under AGPL v3.  Copyright (c) 2018 SF Product Labs. All Rights Reserved.
-- See LICENSE

-- SF Product Labs MSGXC Schema
--drop keyspace msgxc;
CREATE KEYSPACE msgxc WITH replication = {'class': 'NetworkTopologyStrategy', 'DC1': '1'}  AND durable_writes = true;

use msgxc;

create table sequences (
  name text,
  seq int,
  PRIMARY KEY (name)
);
insert into sequences (name, seq) values('DB_VER',1);

create type geo_point (
 lat double,
 lon double
);

create table hosts (
  hhash text,
  hostname text,
  primary key((hhash), hostname) 
);

--INTERNAL & EXTERNAL SERVICES
create table services (
  name    text,
  secret  text, --secret hash
  roles   set<text>,
  expiry date,
  created timestamp,
  owner uuid,
  updated timestamp,
  updater uuid,
  primary key       (name)
);

--EVENTING
create table queues (
  id timeuuid,
  src text, --source action Ex. sms
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
  PRIMARY KEY ((id))
);
CREATE INDEX queues_type_idx ON queues ( src );
CREATE INDEX queues_completed_idx ON queues ( completed );
CREATE INDEX queues_started_idx ON queues ( started );


create table action_names (
  name text,
  PRIMARY KEY ((name))
);


create table actions (
  sid timeuuid, --source id Ex. message-id
  src text, --source action Ex. message, queues
  did uuid, --unique id differentiator (Ex uid)
  dsrc text, --Ex diffentiator source ex. uid
  meta map<text,text>, --METADATA, SPLIT etc.
  exqid timeuuid, --executing queue id
  created timestamp,  
  started timestamp,
  completed timestamp,
  PRIMARY KEY (sid,did)
);

--external actions
create table actions_ext (
  sid text, --source id, audit id, inc. external Ex. SES message-id
  svc text, --Ex. SES, 'message', 'sms, 'action'
  iid timeuuid, --internal id (Esp. action id)
  uid uuid, --optional user id
  created timestamp,
  updated timestamp,
  meta map<text,text>, --METADATA Ex. Clean to ehash *not* email:xxx.x.com, bounce:true, etc.
  PRIMARY KEY ((sid),svc)
)
WITH default_time_to_live = 1209600; --2 weeks

--should never be updated
create table cohorts (
  name text,
  uids_url text,
  imported int, --successful imports (count)
  started timestamp,
  completed timestamp,
  created timestamp,
  owner uuid,
  PRIMARY KEY ((name))
);

create table messages (
  id timeuuid,
  subject text,
  template text, --use a url for now (should be a github/gitlab api selector to a list of templates made in static.staging.homodea.com)
  app text, --app 
  rel text, 
  ver int, --version
  schedule timestamp,
  started timestamp,
  completed timestamp,
  ptyp text, 
  auth text, --author
  xid text, --experiment id 
  cohorts set<text>,
  ehashes set<text>, 
  chashes set<text>,
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
  created timestamp,
  owner uuid,
  updated timestamp,
  updater uuid,
  PRIMARY KEY ((id))
);


--NATS Specializations
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
