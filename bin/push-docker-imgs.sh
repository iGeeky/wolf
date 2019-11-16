if [ "$#" == "0" ]; then
  echo "Usage: sh $0 TAG"
  echo "\tTAG: 1.2.3"
  exit 1
else
  TAG="$1"
  echo "used input tag: ${TAG}"
fi


docker push igeeky/wolf-server:${TAG}
docker push igeeky/wolf-server:latest
docker push igeeky/wolf-agent:${TAG}
docker push igeeky/wolf-agent:latest
