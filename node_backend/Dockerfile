# ===================================================
# ==                 BASE STAGE                    ==
# ===================================================
# This stage installs all dependencies.
# It's used as a base for both development and the production build.
FROM node:20-slim as base
WORKDIR /app
COPY package*.json ./
RUN npm install

# ===================================================
# ==               DEVELOPMENT STAGE               ==
# ===================================================
# This is the stage used for local development.
# It includes dev dependencies and uses tsx for hot-reloading.
FROM base as development
WORKDIR /app
# Copy the rest of the application code
COPY . .
# Expose the port the app runs on
EXPOSE 3000
# The command is specified in docker-compose.yml to allow for easy overrides.
CMD ["npm", "run", "dev"]

# ===================================================
# ==                  BUILD STAGE                  ==
# ===================================================
# This stage builds the TypeScript code into JavaScript.
FROM base as build
WORKDIR /app
COPY . .
RUN npm run build

# ===================================================
# ==                PRODUCTION STAGE               ==
# ===================================================
# This is the final, lean production image.
# It only contains the built code and production dependencies.
FROM node:20-slim as production
WORKDIR /app
ENV NODE_ENV=production
# Copy production dependencies
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
# Copy the built application code
COPY --from=build /app/dist ./dist
# Expose the port the app runs on
EXPOSE 3000
# The command to run the application
CMD ["npm", "run", "start"]
