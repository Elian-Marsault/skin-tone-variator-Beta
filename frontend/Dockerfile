# Build stage
FROM node:20-alpine AS build

# Déclarer l'ARG
ARG VITE_API_URL=https://skin-tone-variator-beta.onrender.com

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Créer le fichier .env.production avec la variable
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env.production

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]