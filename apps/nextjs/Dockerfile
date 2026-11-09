FROM node:26.12.0-alpine

WORKDIR /workspace
RUN npm install --global pnpm@12.18.0

COPY . .
RUN --mount=type=cache,id=custa-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
RUN CI=1 NEXT_TELEMETRY_DISABLED=1 pnpm --filter @acme/nextjs build
RUN chown -R node:node apps/nextjs/.next

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@acme/nextjs", "exec", "next", "start", "--hostname", "0.0.0.0"]
