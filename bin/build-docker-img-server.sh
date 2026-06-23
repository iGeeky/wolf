if [ "$#" == "0" ]; then
  echo "Usage: sh $0 TAG"
  echo "\tTAG: 1.2.3"
  exit 1
fi

TAG="$1"
echo "BUILD TAG: $TAG"
echo "BUILD CONSOLE..."
cd ./console && pnpm install && pnpm run build
if [ "$?" != "0" ]; then
  echo "build console failed!"
  exit 2
fi
cd ../
echo "BUILD SERVER..."
bash ./bin/docker-build-image.sh igeeky/wolf-server "$TAG" ./server/Dockerfile ./server
if [ "$?" != "0" ]; then
  echo "build server docker image failed!"
  exit 2
fi
echo "BUILD SUCCESS."
