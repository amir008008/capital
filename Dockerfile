FROM node:18.15.0


WORKDIR /app

COPY package*.json ./
RUN npm cache clean --force
RUN npm install

COPY . .

EXPOSE 5000
CMD [ "npm", "start" ]
