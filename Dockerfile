FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Skip downloading Puppeteer's browser to avoid network issues during build
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
