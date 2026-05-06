FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# Vite standard host exposure to allow mapping to host machine
CMD ["npm", "run", "dev", "--", "--host"]
