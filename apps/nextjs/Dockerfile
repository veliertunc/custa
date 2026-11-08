FROM node:22.21.0-alpine

WORKDIR /workspace
RUN npm install --global pnpm@10.19.0

COPY . .
RUN pnpm install --frozen-lockfile
RUN CI=1 NEXT_TELEMETRY_DISABLED=1 pnpm --filter @acme/nextjs build
RUN chown -R node:node apps/nextjs/.next

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@acme/nextjs", "exec", "next", "start", "--hostname", "0.0.0.0"]
