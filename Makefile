.PHONY : install test push force_push

install:
	rm -f yarn.lock || true
	yarn install

test:
	yarn test

push:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push all master

force_push:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push -f all master
