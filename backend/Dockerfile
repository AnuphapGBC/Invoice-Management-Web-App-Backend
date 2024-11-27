# Use a base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy the package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variables if necessary
ENV PORT 5001

# Expose the port that the app listens to
EXPOSE 5001

# Run the server
CMD ["node", "server.js"]
