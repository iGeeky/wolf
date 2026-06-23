FROM node:20-alpine

# 安装编译 native 模块所需的依赖
RUN apk add --no-cache python3 make g++

# pnpm@latest (v11+) 在 Node 18 下会触发 corepack ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY ./ /opt/wolf/server
WORKDIR /opt/wolf/server


# 安装依赖
RUN pnpm install

# 修复 rax-radix-tree 编译问题（添加缺失的头文件）并重新编译
RUN cd /opt/wolf/server/node_modules/rax-radix-tree && npm run install


EXPOSE 12180
ENTRYPOINT ["sh", "./entrypoint.sh"]
