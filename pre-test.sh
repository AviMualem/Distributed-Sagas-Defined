#!/bin/bash

# Get container ports:
DB_NAME=test
MONGO_PORT1=37017
MONGO_PORT2=37018
MONGO_PORT3=37019

echo 127.0.0.1 localmongo1 >> /etc/hosts
echo 127.0.0.1 localmongo2 >> /etc/hosts
echo 127.0.0.1 localmongo3 >> /etc/hosts

CONNECTION_STRING="mongodb://localhost:${MONGO_PORT1},localhost:${MONGO_PORT2},localhost:${MONGO_PORT3}/${DB_NAME}?replicaSet=rs0"

declare -a arr=("apartment-service" "book-trip-sec" "car-service" "restaurant-service")

for dir_name in "${arr[@]}"
do
    echo ${dir_name}
    echo mongo_connection_string=${CONNECTION_STRING} > ./${dir_name}/.env
done
