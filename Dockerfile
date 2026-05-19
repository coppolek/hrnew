FROM node:22-alpine

# Use Node 22 to support --experimental-strip-types

WORKDIR /app

# Copy package info
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for vite build) 
RUN npm install

# Copy source
COPY . .

# Build the frontend assets (Vite)
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
