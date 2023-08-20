# Use the official Node.js image as the base image
FROM node:14

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install the frontend dependencies
RUN npm install

# Copy the rest of the frontend code to the container
COPY . .

# Expose port 3000 (default port for Create React App projects)
EXPOSE 3000

# Run the frontend application
CMD [ "npm", "start" ]
