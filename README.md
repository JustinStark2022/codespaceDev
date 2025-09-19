# Monorepo Development Environment with Docker and Neon

This repository contains a complete development and production setup for a TypeScript monorepo, orchestrated with Docker Compose and connected to a Neon-hosted PostgreSQL database.

## 🚀 Quick Start (Development)

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
- **Docker & Docker Compose**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Git**: For cloning the repository.
- **A Neon Account**: [Create a free Neon project](https://neon.tech/) to get your database URLs.

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd <repository-name>
```

### 2. Configure Environment Variables
Copy the example environment file and fill in your details.

```bash
cp .env.example .env
```
Now, open the `.env` file in your editor and add your **Neon Database URLs** and a **JWT Secret**.

- `DATABASE_URL`: Your Neon direct connection string.
- `DATABASE_POOL_URL`: Your Neon pooled connection string.
- `JWT_SECRET`: A long, random string for signing tokens.

**Important**: Your Neon URLs must include `?sslmode=require`.

### 3. Start the Services
Bring up the entire stack using Docker Compose. This will build the container images and start the services in detached mode.

```bash
docker compose up -d --build
```

### 4. Access the Services
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **Backend Health Check**: [http://localhost:3000/health](http://localhost:3000/health)
- **Frontend App**: [http://localhost:5173](http://localhost:5173)

## 🔧 VS Code Dev Container Workflow
For an integrated development experience, you can use the included Dev Container configuration.

1.  **Prerequisites**: VS Code + [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
2.  Open the cloned repository in VS Code.
3.  Click the notification popup that says "Reopen in Container" or use the Command Palette (`Ctrl+Shift+P`) to find and run **"Dev Containers: Reopen in Container"**.

This will attach VS Code to the `devcontainer` service, and the `post-create.sh` script will automatically install all `npm` dependencies for you.

## 🗃️ Database Migrations (Drizzle)
Migrations are managed by Drizzle Kit and should be run against your Neon database via the `backend` service.

To run pending migrations:
```bash
docker compose exec backend npm run migrate
```

To create a new migration from schema changes (do this locally, not in the container):
```bash
cd node_backend
npm install
npx drizzle-kit generate
```

## 🏭 Production Mode
A production-ready compose file is provided to run the application with optimized, production-grade images.

To start in production mode:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
This will:
- **Backend**: Run the `npm run start` command using pre-built JavaScript in `dist/`.
- **Frontend**: Serve the static, optimized React build using a lightweight **Nginx** server.
- **Production Frontend URL**: [http://localhost:8080](http://localhost:8080)

## 🐛 Troubleshooting

- **SSL Errors on Connection**: Ensure your `DATABASE_URL` and `DATABASE_POOL_URL` in the `.env` file both end with `?sslmode=require`.
- **Connection Limits**: For web traffic, always use the `DATABASE_POOL_URL`. The direct `DATABASE_URL` should only be used for migrations or direct admin tasks to avoid exhausting connection limits.
- **Port Conflicts**: If you have another service running on port `3000` or `5173`, you can change the host-side port mapping in `docker-compose.yml`. For example, change `"3000:3000"` to `"3001:3000"` to map the container's port 3000 to your host's port 3001.
- **Windows Line Endings**: If you encounter errors with shell scripts (`.sh`), ensure they have LF line endings. You can configure Git to handle this automatically: `git config --global core.autocrlf input`.
- **Node Memory Issues**: For very large builds, you might need to increase the memory available to Node.js. You can do this by setting an environment variable in `docker-compose.yml`: `NODE_OPTIONS=--max_old_space_size=4096`.
