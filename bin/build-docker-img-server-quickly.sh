if [ "$#" == "0" ]; then
  echo "Usage: sh $0 TAG"
  echo "\tTAG: 1.2.3"
  exit 1
fi

TAG="$1"
echo "BUILD TAG: $TAG"

# don't rebuild console project in quickly mode
#cd ./console && npm run build:prod && cd ../

docker build -t igeeky/wolf-server:$TAG -f ./server/DockerfileQuickly ./server
docker build -t igeeky/wolf-server:latest -f ./server/DockerfileQuickly ./server
