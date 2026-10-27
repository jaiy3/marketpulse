FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Full node_modules from the builder: the prisma CLI is needed at runtime to apply migrations.
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY public ./public
USER node
EXPOSE 4000
# Apply pending migrations, then start. Prevents "table does not exist" errors on a fresh database.
CMD ["npm", "run", "start:prod"]
