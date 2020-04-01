-- RUN THIS FIRST
-- curl -w "\n" -k -XDELETE "http://cassandra-seed1:9200/mxcusers"
-- curl -w "\n" -k -XDELETE "http://cassandra-seed1:9200/msgxca"
-- curl -w "\n" -k -XDELETE "http://cassandra-seed1:9200/mxctriage"
-- curl -w "\n" -k -XDELETE "http://cassandra-seed1:9200/mxcfailures"

use hd;
drop table mxccerts;
drop table user_certs;
drop table group_certs;
drop table mxctriage;
drop table mxcfailures;

create type mdevice (
  mtype text,
  did text,
  updated timestamp
);

COPY users (uid,mdevices) to 'devices.csv' with header=false;
alter table users drop mdevices;
alter table users add mdevices int;
alter table users drop mdevices;
alter table users add mdevices set<frozen<mdevice>>; 
COPY users (uid,mdevices) from 'devices.csv' with header=false;
drop type mxcdevice;

--confirm on staging 
--select mdevices from users where uid=00000000-0000-0000-0000-000000000000;