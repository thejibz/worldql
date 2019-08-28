#!/usr/bin/env bash

# wait for ES to start
chmod +x /data/worldql-core/test/setup/wait-for-it.sh
ls -lah /data/worldql-core/test/setup/
/data/worldql-core/test/setup/wait-for-it.sh localhost:9200 --timeout=30 --strict

# load data in ES
curl -X DELETE "localhost:9200/companydatabase"
curl -XPUT 'localhost:9200/companydatabase' -H 'Content-Type: application/json' -d' {"mappings" : { "employees" : { "properties" : { "FirstName" : { "type" : "text" }, "LastName" : { "type" : "text" }, "Designation" : { "type" : "text" }, "Salary" : { "type" : "integer" }, "DateOfJoining" : { "type" : "date", "format": "yyyy-MM-dd" }, "Address" : { "type" : "text" }, "Gender" : { "type" : "text" }, "Age" : { "type" : "integer" }, "MaritalStatus" : { "type" : "text" }, "Interests" : { "type" : "text" }}}}}' 
curl -s -H "Content-Type: application/x-ndjson" -XPOST localhost:9200/_bulk --data-binary @/data/worldql-core/test/data/elasticsearch/Employees50K.json
curl -v http://localhost:9200/companydatabase/_count?pretty=true
