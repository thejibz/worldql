#!/usr/bin/env bash

# wait for ES to start
chmod +x /tmp/setup/wait-for-it.sh
/tmp/setup/wait-for-it.sh localhost:9200 --timeout=30 --strict

# load data in ES
curl -XPUT 'localhost:9200/companydatabase?pretty' -H 'Content-Type: application/json' -d' {"mappings" : { "employees" : { "properties" : { "FirstName" : { "type" : "text" }, "LastName" : { "type" : "text" }, "Designation" : { "type" : "text" }, "Salary" : { "type" : "integer" }, "DateOfJoining" : { "type" : "date", "format": "yyyy-MM-dd" }, "Address" : { "type" : "text" }, "Gender" : { "type" : "text" }, "Age" : { "type" : "integer" }, "MaritalStatus" : { "type" : "text" }, "Interests" : { "type" : "text" }}}}}' 
#curl -XPUT 'localhost:9200/companydatabase/_bulk' --data-binary @Employees50K.json
curl -s -H "Content-Type: application/x-ndjson" -XPOST localhost:9200/_bulk --data-binary @/tmp/data/Employees50K.json
curl -v http://localhost:9200/companydatabase/_count?pretty=true