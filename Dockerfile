FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
ENV NODE_ENV=production
USER node
CMD ["npm","run","start","-w","@careeros/api"]
