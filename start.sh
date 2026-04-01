#!/bin/bash
mkdir -p .mongodb/data .mongodb/logs

# Start MongoDB in the background
mongod --dbpath .mongodb/data --logpath .mongodb/logs/mongod.log --fork --bind_ip 127.0.0.1 --port 27017

echo "MongoDB started"

# Start the app server
npm run dev
