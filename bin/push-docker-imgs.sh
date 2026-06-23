if [ "$#" == "0" ]; then
  echo "Usage: sh $0 TAG"
  echo "\tTAG: 1.2.3"
  exit 1
else
  TAG="$1"
  echo "used input tag: ${TAG}"
fi

push_image_tags() {
  local image="$1"
  local tag="$2"
  for t in "${tag}" "${tag}-amd64" "${tag}-arm64" latest latest-amd64 latest-arm64; do
    echo "push ${image}:${t}"
    docker push "${image}:${t}"
  done
}

push_image_tags igeeky/wolf-server "${TAG}"
push_image_tags igeeky/wolf-agent "${TAG}"
