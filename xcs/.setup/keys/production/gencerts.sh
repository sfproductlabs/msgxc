#!/bin/bash

#USAGE: 
# Generate certs and root
#./gencerts.sh ild 1 true
# Generate only certs
#./gencerts.sh ild 2


if [ -z "$1" ]
  then
    echo "No certificate name supplied"
    exit 1
fi

if [ -z "$2" ]
  then
    echo "No certificate number supplied"
    exit 1
fi

if [ -z "$3" ]
  then
    echo "Skipping CA Generation"
  else
    openssl genrsa -out rootCa.key 4096
    openssl req -new -x509 -days 365 -key rootCa.key -out rootCa.crt -subj "/OU=SFPL"
fi

openssl genrsa -out $1$2.key 1024
openssl req -new -key $1$2.key -out $1$2.csr -subj "/CN=$1$2"
openssl x509 -req -days 365 -in $1$2.csr -CA rootCa.crt -CAkey rootCa.key -set_serial 01 -out $1$2.crt