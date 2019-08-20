#!/usr/bin/env bash

# wait for ES to start
curl https://raw.githubusercontent.com/thejibz/worldql-core/master/test/setup/wait-for-it.sh --output /tmp/wait-for-it.sh
chmod +x /tmp/wait-for-it.sh
/tmp/wait-for-it.sh localhost:9200 --timeout=30 --strict

# load data in ES
curl https://raw.githubusercontent.com/thejibz/worldql-core/master/test/data/elasticsearch/Employees50K.json --output /tmp/Employees50K.json
curl -X DELETE "localhost:9200/companydatabase"
curl -XPUT 'localhost:9200/companydatabase' -H 'Content-Type: application/json' -d' {"mappings" : { "employees" : { "properties" : { "FirstName" : { "type" : "text" }, "LastName" : { "type" : "text" }, "Designation" : { "type" : "text" }, "Salary" : { "type" : "integer" }, "DateOfJoining" : { "type" : "date", "format": "yyyy-MM-dd" }, "Address" : { "type" : "text" }, "Gender" : { "type" : "text" }, "Age" : { "type" : "integer" }, "MaritalStatus" : { "type" : "text" }, "Interests" : { "type" : "text" }}}}}' 
curl -s -H "Content-Type: application/x-ndjson" -XPOST localhost:9200/_bulk --data-binary @/tmp/Employees50K.json
curl -v http://localhost:9200/companydatabase/_count?pretty=true