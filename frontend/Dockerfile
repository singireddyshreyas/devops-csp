FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginxinc/nginx-unprivileged:1.29.1-alpine3.22
USER root
RUN apk upgrade --no-cache
USER 101
ENV NGINX_ENVSUBST_TEMPLATE_VARS=BACKEND_HOST BACKEND_HOST=backend:8000
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 8080
