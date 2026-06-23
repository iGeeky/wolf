if [ "$#" == "0" ]; then
  echo "Usage: sh $0 TAG"
  echo "\tTAG: 1.2.3"
  exit 1
fi

TAG="$1"
echo "BUILD TAG: $TAG"

# don't rebuild console project in quickly mode
#cd ./console && pnpm run build && cd ../

bash ./bin/docker-build-image.sh igeeky/wolf-server "$TAG" ./server/DockerfileQuickly ./server
