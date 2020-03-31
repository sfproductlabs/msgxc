from pyhive import hive
import pandas as pd
from os import getenv

conn = hive.Connection(host=getenv('HIVE_HOST'), port=10000, username="")

def version():
    return pd.read_sql("select seq as version from msequences where name='MSGXC_VER'", conn).to_json(orient='records')

def sequences():
    return pd.read_sql("SELECT * FROM msequences", conn).to_json(orient='records')

def messages_recent():
    return pd.read_sql("SELECT * FROM mstore", conn).to_json(orient='records')
