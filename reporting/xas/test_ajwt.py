import settings
import ajwt.utils as ajwt
from os import path, walk, getenv
from pathlib import Path

pubKey = None
if getenv('AJWT_CERT') != None:
    pubKey = Path(getenv('AJWT_CERT')).read_text()

privKey = None
if getenv('AJWT_KEY') != None:
    privKey = Path(getenv('AJWT_KEY')).read_text()

def test_ajwt_version():
    assert ajwt.version() == 2

def test_ajwt_test_key():
    assert None != getenv('APP_SECRET')

def test_ajwt_v1():
    ver1 = ajwt.decode(getenv('AJWT_KEY_V1'), secret=getenv('APP_SECRET'), algorithms=['HS256'])
    print(ver1)
    assert None != ver1

def test_ajwt_v2():
    ver2 = ajwt.decode(getenv('AJWT_KEY_V2'), privkey=privKey, pubkey=pubKey, algorithms=['RS256'])
    print(ver2)
    assert None != ver2
