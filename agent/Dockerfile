FROM openresty/openresty:alpine
RUN apk add --update \
    sed \
    && rm -rf /var/cache/apk/*
COPY ./ /opt/wolf/agent
WORKDIR /opt/wolf/agent
EXPOSE 10082
ENTRYPOINT ["sh", "./entrypoint.sh"]
