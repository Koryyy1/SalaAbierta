# T11: compila la versión web de la app (Expo) y la sirve con Caddy, que además
# obtiene el certificado HTTPS automáticamente y reenvía /api/* al backend.
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ .
# La web y la API comparten dominio, por eso la URL de la API es la del propio sitio
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN echo '/// <reference types="expo/types" />' > expo-env.d.ts && npx expo export --platform web

FROM caddy:2-alpine
COPY despliegue/Caddyfile /etc/caddy/Caddyfile
COPY --from=compilacion /app/dist /srv
