#!/bin/bash

# Get container ports:
DB_NAME=test

for i in $(seq 1 1 3); do
    eval "MONGO_PORT$i=$(docker inspect -f '{{(index (index .NetworkSettings.Ports "27017/tcp") 0).HostPort}}' localmongo${i})"
done

CONNECTION_STRING="mongodb://localhost:${MONGO_PORT1},localhost:${MONGO_PORT2},localhost:${MONGO_PORT3}/${DB_NAME}?replicaSet=rs0"

declare -a arr=("apartment-service" "book-trip-sec" "car-service" "restaurant-service")

for dir_name in "${arr[@]}"
do
    echo ${dir_name}
    echo mongo_connection_string=${CONNECTION_STRING} > ./${dir_name}/.env
done