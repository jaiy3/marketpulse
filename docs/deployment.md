# Cloud Deployment Path

The repository is designed to run as two application processes (`api` and `worker`) plus PostgreSQL and Redis.

## First cloud deployment: AWS EC2 + Docker

A practical learning deployment is a small Ubuntu EC2 instance running the Docker Compose stack. This keeps the infrastructure understandable while still giving hands-on cloud experience.

1. Create an EC2 instance and configure SSH plus HTTP/HTTPS access.
2. Install Docker and Docker Compose.
3. Clone the repository.
4. Create `.env` with production secrets.
5. Change the Compose secrets and CORS origin from their local values.
6. Run `docker compose up -d --build`.
7. Run `docker compose exec api npx prisma migrate deploy`.
8. Put the API behind HTTPS (for example with Nginx + Let's Encrypt) before exposing it publicly.
9. Verify `/health`, `/docs`, `/metrics`, and the WebSocket endpoint.

## Next step toward production AWS architecture

Once the single-host deployment is understood, the services can be separated:

- API/worker containers -> ECS/Fargate
- PostgreSQL -> RDS
- Redis -> ElastiCache
- Static frontend -> S3/CloudFront if a frontend is added
- Secrets -> AWS Secrets Manager
- Logs/metrics -> CloudWatch and/or Prometheus/Grafana

The project deliberately starts with a simpler architecture so each infrastructure decision can be explained rather than hidden behind managed services.
