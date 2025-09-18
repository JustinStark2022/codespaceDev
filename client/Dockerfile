# ===================================================
# ==                 BUILD STAGE                   ==
# ===================================================
# This stage installs dependencies and builds the React app.
FROM node:20-slim as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ===================================================
# ==               DEVELOPMENT STAGE               ==
# ===================================================
# This is the stage used for local development with Vite's dev server.
FROM node:20-slim as development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Expose the Vite development port
EXPOSE 5173
# The command is specified in docker-compose.yml to enable HMR.
CMD ["npm", "run", "dev"]

# ===================================================
# ==                PRODUCTION STAGE               ==
# ===================================================
# This is the final, lean production image using Nginx.
FROM nginx:1.25-alpine as production
# Set the port Nginx will listen on
EXPOSE 80
# Copy the custom Nginx configuration
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built static assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html
# The default Nginx command will run, serving the files.
CMD ["nginx", "-g", "daemon off;"]
