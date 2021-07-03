#!/bin/bash


if [ ! -n "${BACKEND_URL}" ]; then
  BACKEND_URL="http://127.0.0.1:12184"
fi
if [ ! -n "${RBAC_SERVER_URL}" ]; then
  RBAC_SERVER_URL="http://127.0.0.1:12180"
fi
if [ ! -n "${RBAC_APP_ID}" ]; then
  RBAC_APP_ID="unknow"
fi
if [ ! -n "${AGENT_PORT}" ]; then
  AGENT_PORT="12182"
fi

if [ ! -n "${EXTENSION_CONFIG}" ]; then
  EXTENSION_CONFIG="#EXTENSION_CONFIG"
fi


sed -e "s|http://127.0.0.1:12184|${BACKEND_URL}|" \
  -e "s|http://127.0.0.1:12180|${RBAC_SERVER_URL}|" \
  -e "s/unknow/${RBAC_APP_ID}/" \
  -e "s/12182/${AGENT_PORT}/" \
  -e "s|#EXTENSION_CONFIG|${EXTENSION_CONFIG}|" \
  conf/server-demo.conf \
  > /etc/nginx/conf.d/app-${RBAC_APP_ID}.conf

/usr/local/openresty/bin/openresty -g "daemon off;"