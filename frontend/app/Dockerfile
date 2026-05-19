FROM node:20-alpine

WORKDIR /app

# Copy the package.json and lock file to install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app and build
COPY . .

EXPOSE 3000

# We use npm run dev in docker for quick iteration, mapping port 3000
CMD ["npm", "run", "dev"]
