#!/bin/bash

# Build the Docker image
echo "Building Docker image..."
docker build -t medical-assistant-ui .

# Run the container
echo "Starting the application..."
docker run -p 3000:3000 --env-file .env.docker medical-assistant-ui
