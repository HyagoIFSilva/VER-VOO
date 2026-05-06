FROM node:18-slim

# Install system dependencies needed for Playwright (if running live chromium inside Docker)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

# Install Playwright browser engines
RUN npx playwright install chromium

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
