FROM node:20-alpine
WORKDIR /app

COPY apps/cockpit-ui/package.json ./
COPY apps/cockpit-ui/src ./src

ENV PORT=5230
EXPOSE 5230
CMD ["node", "src/index.js"]
