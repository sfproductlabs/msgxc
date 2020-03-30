from pyhive import hive
import pandas as pd
from os import getenv

conn = hive.Connection(host=getenv('HIVE_HOST'), port=10000, username="")

def sequences():
    return pd.read_sql("SELECT * FROM sequences", conn).to_json(orient='records')
