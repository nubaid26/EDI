#!/bin/bash

echo "Setting up CloudGuard AI..."

# Install dependencies
npm install

# Build the frontend
npm run build

# Start the application
npm run dev
