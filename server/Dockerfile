FROM node:alpine

COPY ./ /opt/wolf/server
WORKDIR /opt/wolf/server
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
  apk --no-cache add postgresql-libs && \
  apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python postgresql-dev && \
  npm install --quiet node-gyp -g &&\
  npm --registry https://registry.npm.taobao.org install && \
  apk del native-deps

EXPOSE 10080
ENTRYPOINT ["sh", "./entrypoint.sh"]
