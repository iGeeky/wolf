if [ "$#" == "0" ]; then
  echo "Usage: sh $0 TAG"
  echo "\tTAG: 1.2.3"
  exit 1
fi

TAG="$1"
echo "BUILD TAG: $TAG"
docker build -t igeeky/wolf-agent:$TAG -f ./agent/Dockerfile ./agent
docker build -t igeeky/wolf-agent:latest -f ./agent/Dockerfile ./agent