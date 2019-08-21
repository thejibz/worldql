#!/usr/bin/env bash

# wait for MySQL to start
bash /data/worldql-core/test/setup/wait-for-it.sh localhost:3306 --timeout=30 --strict

# load data in mysql
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /data/worldql-core/test/data/mysql/test_db/employees.sql