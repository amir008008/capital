# Use the official Node.js image as the base image
FROM node:14

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install the backend dependencies
RUN npm install

# Copy the rest of the backend code to the container
COPY . .

# Expose port 5000 (as you mentioned your backend runs on this port)
EXPOSE 5000

# Run the backend application
CMD [ "node", "server.js" ]
