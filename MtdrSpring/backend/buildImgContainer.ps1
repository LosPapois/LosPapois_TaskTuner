docker stop agilecontainer
docker rm -f agilecontainer
docker rmi agileimage
mvn clean verify
docker build -f Dockerfile --platform linux/amd64 -t agileimage:0.1 .
docker run --name agilecontainer -p 8000:8000 -d agileimage:0.1
