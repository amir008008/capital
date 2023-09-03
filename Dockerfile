FROM node:20.5.1


WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000
CMD [ "npm", "start" ]
