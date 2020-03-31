CREATE TABLE msequences USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'msgxc', table 'sequences'); 
CREATE TABLE musers USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'msgxc', table 'users'); 
CREATE TABLE msec USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'msgxc', table 'msec'); 
CREATE TABLE mthreads USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'msgxc', table 'mthreads'); 
CREATE TABLE mtriage USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'msgxc', table 'mtriage');
CREATE TABLE mstore USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'msgxc', table 'mstore');
CREATE TABLE mfailures USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'msgxc', table 'mfailures');   