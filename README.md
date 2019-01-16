# Distributed-Sagas-Defined  
:scream: This is where the distributed magic happens.  :scream:   

This repository contains implementaion for a generic saga execution coordinator written in TypeScript. 

## Prerequisites:  
### Creating a local mongodb replica set  
Due to the fact the services composing the saga needs to be idempotent in requests they are processing  
they need to be based a persistency solution that supports transactions.  

MongoDB 4.0 which is being used in the implementation supports transacion but it requires to be deployed in replica set  
in order to do so.  

We will create a mongodb replica set named "rs0" for the purpose of running our solution.  
cluster will have 3 nodes, and docker will be used to create the entire cluster.  

### Creating 3 mongo nodes:  
docker network create saga-mongo  
docker run --name mongo-node1 -d -p 37017:37017 --net saga-mongo-network mongo --replSet "rs0" --port 37017  
docker run --name mongo-node2 -d -p 37018:37018 --net saga-mongo-network mongo --replSet "rs0" --port 37018  
docker run --name mongo-node3 -d -p 37019:37019 --net saga-mongo-network mongo --replSet "rs0" --port 37019  

### creating the replica set config
docker exec -it mongo-node1 mongo --port 37017   
```json
config = {  
      "_id" : "rs0",  
      "members" : [  
          {  
              "_id" : 0,  
              "host" : "mongo-node1:37017"  
          },  
          {  
              "_id" : 1,  
              "host" : "mongo-node2:37018"  
          },  
          {  
              "_id" : 2,  
              "host" : "mongo-node3:37019"  
          }  
      ]  
  }  
```

  
// Applying the config.  
rs.initiate(config)   

// checking replica set is functioning.  
rs.status()  

### Editing host file:  
Add the following entries to your host file in order to properly communicate with the replica set.  
127.0.0.1 mongo-node1  
127.0.0.1 mongo-node2  
127.0.0.1 mongo-node3  

### Connecting to the replica set    
Use the following connection string structure to connect to the replica set:  

mongodb://mongo-node1:37017,mongo-node2:37018,mongo-node3:37019/?3t.uriVersion=2&3t.connection.name=ConnectionName&readPreference=primary&3t.sharded=true&3t.connectionMode=multi

### Creating a database and composing a connection string for the code.
Create a database with any name you want and use the following connection string in the mongo_connection_string env variable  
which is defined in the .env file.  
mongodb://localhost:37017,localhost:37018,localhost:37019/YourDbName?replicaSet=rs0  

## Running & Debugging Services:  
every service has envtemplate file that represent the needed environment variable definitons rquired for the code.  
Create a .env file within the project root folder with your desired config.  

### Car Service:  
npm install  
npm start  
vs code debug config name: Debug-Car-Service  
Api port: 3000    
Swagger page: http://localhost:3000/api/  

### Apartment Service:  
npm install  
npm start  
vs code debug config name: Debug-Apartment-Service  
Api port: 3001    
Swagger page: http://localhost:3001/api/  

### Restaurant Service:  
npm install  
npm start  
vs code debug config name: Debug-Restaurant-Service  
Api port: 3002    
Swagger page: http://localhost:3002/api/  

### Book a trip SEC Service:
npm install  
npm run coverage - istanbul coverage report   
npm run test - mocha test with html report   

