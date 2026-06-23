#!/bin/bash
# Build docker image for linux/amd64 and linux/arm64.
# Default tags (TAG, latest) point to amd64; arch-specific tags use -amd64 / -arm64 suffix.
#
# Usage: bin/docker-build-image.sh IMAGE TAG DOCKERFILE CONTEXT
# Example: bin/docker-build-image.sh igeeky/wolf-agent 1.0.0 ./agent/Dockerfile ./agent

set -e

IMAGE="$1"
TAG="$2"
DOCKERFILE="$3"
CONTEXT="$4"

if [ -z "$IMAGE" ] || [ -z "$TAG" ] || [ -z "$DOCKERFILE" ] || [ -z "$CONTEXT" ]; then
  echo "Usage: $0 IMAGE TAG DOCKERFILE CONTEXT"
  exit 1
fi

echo "BUILD ${IMAGE} TAG=${TAG} (amd64 + arm64)..."

echo "  -> linux/amd64 (default: ${TAG}, latest)"
docker build --platform linux/amd64 \
  -t "${IMAGE}:${TAG}-amd64" \
  -t "${IMAGE}:latest-amd64" \
  -f "$DOCKERFILE" "$CONTEXT"
docker tag "${IMAGE}:${TAG}-amd64" "${IMAGE}:${TAG}"
docker tag "${IMAGE}:latest-amd64" "${IMAGE}:latest"

echo "  -> linux/arm64 (${TAG}-arm64, latest-arm64)"
docker build --platform linux/arm64 \
  -t "${IMAGE}:${TAG}-arm64" \
  -t "${IMAGE}:latest-arm64" \
  -f "$DOCKERFILE" "$CONTEXT"

echo "BUILD SUCCESS: ${IMAGE}"
echo "  default (amd64): ${IMAGE}:${TAG}, ${IMAGE}:latest"
echo "  amd64:           ${IMAGE}:${TAG}-amd64, ${IMAGE}:latest-amd64"
echo "  arm64:           ${IMAGE}:${TAG}-arm64, ${IMAGE}:latest-arm64"
