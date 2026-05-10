docker-compose up -d spring-backend
sleep 15
curl -v http://localhost:8080/api/v1/auth/google
