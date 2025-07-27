# Use the official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app files
COPY . .

# Expose port (optional: match the port your app uses)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
