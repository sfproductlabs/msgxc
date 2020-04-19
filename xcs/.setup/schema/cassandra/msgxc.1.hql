CREATE TABLE msequences USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'sfpl', table 'sequences'); 
CREATE TABLE musers USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'sfpl', table 'users'); 
CREATE TABLE msec USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'sfpl', table 'msec'); 
CREATE TABLE mthreads USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'sfpl', table 'mthreads'); 
CREATE TABLE mtriage USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'sfpl', table 'mtriage');
CREATE TABLE mstore USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'sfpl', table 'mstore');
CREATE TABLE mfailures USING org.apache.spark.sql.cassandra OPTIONS (keyspace 'sfpl', table 'mfailures');   