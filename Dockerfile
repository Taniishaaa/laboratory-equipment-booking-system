# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend API that also serves the built frontend ----
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5433/db" npx prisma generate
COPY --from=frontend /app/frontend/dist ./public
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]