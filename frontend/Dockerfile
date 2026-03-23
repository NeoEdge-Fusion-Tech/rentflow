FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000
EXPOSE 5173

CMD ["npm", "run", "dev"]
