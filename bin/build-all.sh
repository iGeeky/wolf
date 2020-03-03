if [ "$#" == "0" ]; then
  # echo "Usage: sh $0 TAG"
  # echo "\tTAG: 1.2.3"
  # exit 1
  TAG=`cd wolf && git describe`
  echo "used tag of git: ${TAG}"
else
  TAG="$1"
  echo "used input tag: ${TAG}"
fi

bash ./bin/build-docker-img-agent.sh $TAG
bash ./bin/build-docker-img-server.sh $TAG
