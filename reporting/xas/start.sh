#!/bin/bash
gunicorn server:app \
      -w 10 \
      -k gevent \
      --timeout 120 \
      -b  0.0.0.0:8123 \
      --limit-request-line 0 \
      --limit-request-field_size 0      