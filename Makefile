# Every recipe calls the npm script that already holds the command, so a command has one home and
# cannot disagree with itself.

.DEFAULT_GOAL := help

.PHONY: help install check format lint typecheck test test-workspace test-mobile test-behaviour ios android web pictures clean

help: ## print the targets, and this is the default goal
	@awk 'match($$0, /^[a-z][a-z-]*:[^#]*## /) { printf "  %-15s %s\n", substr($$0, 1, index($$0, ":") - 1), substr($$0, RLENGTH + 1) }' $(MAKEFILE_LIST)

install: ## install every dependency from the lock file
	npm ci

check: ## everything the pipeline runs, in the pipeline's order, stopping at the first failure
	npm run format:check
	npm run lint
	npm run typecheck
	npm run check:documents
	npm run check:brand
	npm run check:reference
	npm run check:sheet
	npm run check:features
	npm test

format: ## write the formatting the pipeline checks
	npm run format

lint: ## read every file for the rules the pipeline enforces
	npm run lint

typecheck: ## read every type, in the root project and in each workspace
	npm run typecheck

test: ## run the workspace tests and the application tests
	npm test

test-workspace: ## run the tests of the packages, the tools and the brand
	npm run test:workspace

test-mobile: ## run the tests of the application
	npm run test:mobile

test-behaviour: ## run the scenarios, one feature file for each feature
	npm run test:behaviour

ios: ## run the application on an iOS simulator
	npm run ios --workspace apps/mobile

android: ## run the application on an Android emulator
	npm run android --workspace apps/mobile

web: ## run the application in a browser
	npm run web --workspace apps/mobile

# A picture script is found by the name it starts with, so a new one needs no edit here.
pictures: ## regenerate every generated picture and document
	@for script in $$(node -p "Object.keys(require('./package.json').scripts).filter((name) => name.startsWith('generate:')).join(' ')"); do npm run $$script || exit 1; done

clean: ## remove node_modules and the build output
	rm -rf node_modules apps/*/node_modules packages/*/node_modules services/*/node_modules
	rm -rf apps/*/dist apps/*/.expo apps/*/web-build coverage infra/build
