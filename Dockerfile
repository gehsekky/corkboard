FROM node:22.1-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY .  .
RUN npm run build
EXPOSE 3000
RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
