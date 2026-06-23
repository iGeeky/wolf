if [ "$#" == "0" ]; then
  echo "Usage: sh $0 TAG"
  echo "\tTAG: 1.2.3"
  exit 1
fi

TAG="$1"
echo "BUILD TAG: $TAG"
bash ./bin/docker-build-image.sh igeeky/wolf-agent "$TAG" ./agent/Dockerfile ./agent
if [ "$?" != "0" ]; then
  echo "build agent docker image failed!"
  exit 2
fi
