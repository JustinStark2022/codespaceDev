FROM node:18-slim

WORKDIR /node_backend

COPY package*.json ./

RUN npm install --omit=optional

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
