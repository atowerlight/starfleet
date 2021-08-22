#!/usr/bin/env bash

COMMAND=$1

if [[ $COMMAND == "enable" ]]; then
	echo "Setting registry to local registry"
	echo "To Disable: yarn local-registry disable"
	yarn config set registry http://localhost:4873/
	npm config set registry http://localhost:4873/
	sed -i '' -e "s/https:\/\/registry.npm.taobao.org/http:\/\/localhost:4873/g" ./.yarnrc

  CURRENT_YARN_REGISTRY=$(yarn config get registry)
  echo "Reverting registries"
  echo "  > YARN: $CURRENT_YARN_REGISTRY"
fi

if [[ $COMMAND == "disable" ]]; then
	yarn config set registry https://registry.npm.taobao.org/
	npm config set registry https://registry.npm.taobao.org/
  sed -i '' -e "s/http:\/\/localhost:4873/https:\/\/registry.npm.taobao.org/g" ./.yarnrc

	CURRENT_YARN_REIGSTRY=$(yarn config get registry)
	echo "Reverting registries"
	echo "  > YARN: $CURRENT_YARN_REIGSTRY"
fi

if [[ $COMMAND == "clear" ]]; then
	echo "Clearing Local Registry"
	rm -rf ./build/local-registry/storage
fi

if [[ $COMMAND == "start" ]]; then
	echo "Starting Local Registry"
	VERDACCIO_HANDLE_KILL_SIGNALS=true
	yarn verdaccio --config ./.verdaccio/config.yaml
fi
