FROM node:22.21.0-alpine

WORKDIR /workspace
RUN npm install --global pnpm@10.19.0

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/sales-mcp/package.json ./services/sales-mcp/
RUN pnpm --filter @custa/sales-mcp install --prod --frozen-lockfile
COPY services/sales-mcp/server.mjs ./services/sales-mcp/

ENV NODE_ENV=production
USER node
EXPOSE 8080
CMD ["node", "services/sales-mcp/server.mjs"]
