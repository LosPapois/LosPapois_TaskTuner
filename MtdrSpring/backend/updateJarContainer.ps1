mvn clean verify
docker exec -it agilecontainer cp /tmp/target/MyTodoList-0.0.1-SNAPSHOT.jar /tmp/MyTodoList.jar
docker stop agilecontainer
docker start agilecontainer

