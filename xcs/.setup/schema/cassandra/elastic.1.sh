#!/bin/bash

# setup
# 

curl -w "\n" -k -XDELETE "http://localhost:9200/msgxca"
curl -XPUT -H 'Content-Type: application/json' http://localhost:9200/msgxca -d'{}'

curl -w "\n" -k -XDELETE "http://localhost:9200/mthreads"
curl -w "\n" -k -XDELETE "http://localhost:9200/mtriage"
curl -w "\n" -k -XDELETE "http://localhost:9200/mstore"
curl -w "\n" -k -XDELETE "http://localhost:9200/mfailures"
curl -w "\n" -k -XDELETE "http://localhost:9200/musers"

# mthreads - wip
curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/mthreads/" -d '{
    "settings" : { "keyspace" : "msgxc" },
    "mappings": {
        "mthreads": {
            "properties" : {
                "tid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "mid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "subs": { "type": "keyword", "index": true, "cql_collection": "list" }
            }
        }
    }
}'

# mstore - completed
curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/mstore/" -d '{
    "settings" : { "keyspace" : "msgxc" },
    "mappings": {
        "mstore": {
            "properties" : {
                "mid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "subject": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "completed": { "type": "date", "index": true, "cql_collection": "singleton" },
                "sys": { "type": "boolean", "index": true, "cql_collection": "singleton" },
                "broadcast": { "type": "boolean", "index": true, "cql_collection": "singleton" },
                "scheduled": { "type": "date", "index": true, "cql_collection": "singleton" },
                "msg": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "owner": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "qid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "createdms": { "type": "long", "index": true, "cql_collection": "singleton" }
            }
        }
    }
}'

# mtriage - completed
curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/mtriage/" -d '{
    "settings" : { "keyspace" : "msgxc" },
    "mappings": {
        "mtriage": {
            "properties" : {
                "mid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "completed": { "type": "date", "index": true, "cql_collection": "singleton" },
                "data": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "createdms": { "type": "long", "index": true, "cql_collection": "singleton" }
            }
        }
    }
}'


curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/musers/" -d '{
    "settings" : { "keyspace" : "msgxc" },
    "mappings": {
        "users": {
            "properties" : {
                "uid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "mtypes": { "type": "keyword", "index": true, "cql_collection": "list" },
                "mdevices": {    
                    "type": "nested",       
                    "cql_collection" : "list",
                    "cql_struct" : "map",             
                    "properties": {
                        "mtype":    { "type": "keyword", "index": false,  "cql_collection": "singleton" },
                        "did":      { "type": "keyword", "index": false,  "cql_collection": "singleton" },
                        "updated":  { "type": "date", "index": false, "cql_collection": "singleton" }
                    }
                }
                
            }
        }
    }
}'

# curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/mcerts" -d '{
#     "settings" : { "keyspace" : "msgxc" },
#     "mappings": {
#         "mcerts" : { "discover" : ".*" }
#     }
# }'

# "cql_struct": "frozen<map>",
curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/mfailures/" -d '{
    "settings" : { "keyspace" : "msgxc" },
    "mappings": {
        "mfailures": {
            "properties" : {
                "mid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "died": { "type": "date", "index": true, "cql_collection": "singleton" },
                "retries": { "type": "integer", "index": true, "cql_collection": "singleton" },
                "mdevice": {
                    "type": "nested",
                    "include_in_parent": true,
                    "dynamic": "false",
                    "cql_collection": "singleton",
                    "properties": {
                        "mtype":    { "type": "keyword", "index": true,  "cql_collection": "singleton" },
                        "did":      { "type": "keyword", "index": true,  "cql_collection": "singleton" },
                        "updated":  { "type": "date", "index": true, "cql_collection": "singleton" }
                    }
                }
            }
        }
    }
}'

nodetool flush msgxc
nodetool rebuild_index msgxc mthreads elastic_mthreads_idx
nodetool rebuild_index msgxc mtriage elastic_mtriage_idx
nodetool rebuild_index msgxc mfailures elastic_mfailures_idx
nodetool rebuild_index msgxc musers elastic_users_idx

# OPTIONAL MERGE INDEXES
curl -w "\n" -k -H 'Content-Type: application/json'  -XPOST  "http://localhost:9200/_reindex" -d '{
  "source": {
    "index": ["mtriage", "mfailures"]
  },
  "dest": {
    "index": "msgxca"
  }
}'

#########################
#### TESTS


curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/mthreads/_search?pretty" -d '
{
  "_source": {
        "exclude": [ "subs" ]
  },
  "query" : {
        "terms" : {
          "subs" : ["14fb0860-b4bf-11e9-8971-7b80435315ac"]
        }
  }
}'


curl -XGET -H -k http://localhost:9200/msgxca/_search?pretty=true&q=*:*

curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/mtriage/_search?pretty" -d '
{
  "query": {
    "bool":{
      "must_not":{
        "bool": {
          "must": [
            {"exists" : { "field" : "completed" }}
          ]
        }
      }
    }
  }
}'


curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/mfailures/_search?pretty" -d '
{
  "query": {
    "bool":{
      "must_not":{
        "bool": {
          "must": [
            {"exists" : { "field" : "died" }}
          ]
        }
      }
    }
  }
}'

curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/musers/_search?pretty"

# curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/musers/_search?pretty" -d '
# {
#   "query" : {
#         "terms" : {
#           "uid" : ["14fb0860-b4bf-11e9-8971-7b80435315ac"]
#         }
#   }
# }'





