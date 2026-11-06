# T11: imagen de la API REST de SalaAbierta
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY . .
# Se ejecuta con el usuario sin privilegios que trae la imagen oficial de Node
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/holamundo >/dev/null || exit 1
CMD ["node", "index.js"]
