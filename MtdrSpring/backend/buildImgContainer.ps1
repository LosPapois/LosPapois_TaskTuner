docker stop agilecontainer
docker rm -f agilecontainer
docker rmi agileimage
mvn clean verify
docker build -f DockerfileDev --platform linux/amd64 \
	--build-arg COHERE_API_KEY="${COHERE_API_KEY}" \
	-t agileimage:0.1 .
docker run --name agilecontainer -p 8080:8080 -d agileimage:0.1
