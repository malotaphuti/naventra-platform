FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Cache npm downloads between builds; retry flaky network fetches
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --fetch-retries=5
COPY . .
RUN npm run build:prod

FROM nginx:1.25-alpine
COPY --from=build /app/dist/fleetops-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
