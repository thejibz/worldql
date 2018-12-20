.PHONY : awl install test push kazan github graphiql playground

install:
	rm -f yarn.lock || true
	yarn install

playground:
	yarn playground

graphiql:
	yarn graphiql

awl:
	yarn awl

test:
	yarn test

push:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push

github:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push github master

kazan:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push kazan master
