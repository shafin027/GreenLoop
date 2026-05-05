#!/bin/bash
set -e

mkdir -p .mongodb/data .mongodb/logs

# Start MongoDB
mongod --dbpath .mongodb/data --logpath .mongodb/logs/mongod.log --fork --bind_ip 127.0.0.1 --port 27017
echo "MongoDB started"

# Build frontend
echo "Building frontend..."
npm run build
echo "Frontend built"

# Start server in production mode
NODE_ENV=production npm run dev
