# Kainella Farms - Enterprise Docker Compose Setup

## Overview

This enterprise-grade Docker Compose configuration provides a production-ready microservices architecture for the Kainella Farms Agritourism Platform. The setup includes comprehensive monitoring, logging, security, and scalability features.

## Architecture

### Core Services

- **Authentication Service** (Port 3001) - User authentication and authorization
- **Booking Service** (Port 3002) - Farm booking and reservation management
- **Payment Service** (Port 3003) - Multi-payment gateway integration
- **Loyalty Service** (Port 3004) - Customer loyalty and rewards program
- **Ticketing Service** (Port 3005) - Event ticketing and QR code generation
- **Notification Service** (Port 3006) - Multi-channel notification system
- **Reporting Service** (Port 3007) - Analytics and business intelligence

### Infrastructure Services

- **Redis** (Port 6379) - Caching and rate limiting
- **MongoDB** (Port 27028) - Primary database
- **RabbitMQ** (Ports 5672, 15672) - Message broker
- **Elasticsearch** (Port 9200) - Search and analytics engine

### API Gateway

- **Nginx Gateway** (Port 8080) - Load balancer and reverse proxy

### Monitoring & Observability

- **Prometheus** (Port 9090) - Metrics collection
- **Grafana** (Port 3000) - Visualization and dashboards
- **Node Exporter** (Port 9100) - System metrics
- **Fluentd** - Log aggregation

### Security

- **Vault** (Port 8200) - Secrets management

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Minimum 8GB RAM
- Minimum 4 CPU cores
- 50GB free disk space

### 1. Environment Setup

```bash
# Copy the enterprise environment template
cp env.enterprise .env

# Edit the environment file with your actual values
nano .env
```

### 2. Generate Secrets

```bash
# Generate secure passwords
openssl rand -base64 32  # For JWT secrets
openssl rand -base64 32  # For session secrets
openssl rand -base64 32  # For Redis password
openssl rand -base64 32  # For MongoDB password
openssl rand -base64 32  # For RabbitMQ password
```

### 3. Start Services

```bash
# Start all services
docker-compose -f docker-compose.enterprise.yml up -d

# Check service status
docker-compose -f docker-compose.enterprise.yml ps

# View logs
docker-compose -f docker-compose.enterprise.yml logs -f
```

### 4. Verify Deployment

```bash
# Check API Gateway health
curl http://localhost:8080/health

# Check individual services
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Booking Service
curl http://localhost:3003/health  # Payment Service
curl http://localhost:3004/health  # Loyalty Service
curl http://localhost:3005/health  # Ticketing Service
curl http://localhost:3006/health  # Notification Service
curl http://localhost:3007/health  # Reporting Service
```

## Monitoring & Dashboards

### Grafana Dashboards

- **URL**: http://localhost:3000
- **Username**: admin
- **Password**: (from GRAFANA_ADMIN_PASSWORD in .env)

### Prometheus Metrics

- **URL**: http://localhost:9090

### Service Health Checks

- **API Gateway**: http://localhost:8080/health
- **Metrics**: http://localhost:8080/metrics

## Configuration Files

### Redis Configuration

- **File**: `redis/redis.conf`
- **Features**: Memory optimization, persistence, security

### MongoDB Configuration

- **File**: `mongodb/mongod.conf`
- **Features**: Replication, security, performance tuning

### RabbitMQ Configuration

- **Files**: `rabbitmq/rabbitmq.conf`, `rabbitmq/definitions.json`
- **Features**: Clustering, queue management, monitoring

### Elasticsearch Configuration

- **File**: `elasticsearch/elasticsearch.yml`
- **Features**: Single-node setup, security, performance

### Monitoring Configuration

- **Prometheus**: `monitoring/prometheus/prometheus.yml`
- **Grafana**: `monitoring/grafana/provisioning/`
- **Fluentd**: `monitoring/fluentd/fluent.conf`

## Security Features

### Network Security

- Isolated Docker networks
- Non-root containers
- Resource limits and reservations
- Security headers in Nginx

### Data Security

- Encrypted connections (TLS/SSL)
- Secure password policies
- Secrets management with Vault
- Regular security updates

### Application Security

- Rate limiting per service
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers

## Performance Optimizations

### Resource Management

- CPU and memory limits per service
- Horizontal scaling support
- Connection pooling
- Caching strategies

### Database Optimization

- MongoDB indexing
- Redis caching
- Elasticsearch optimization
- Connection pooling

### Network Optimization

- Nginx load balancing
- Keep-alive connections
- Gzip compression
- CDN integration ready

## Scaling

### Horizontal Scaling

```bash
# Scale specific services
docker-compose -f docker-compose.enterprise.yml up -d --scale kainella-booking-service=3
docker-compose -f docker-compose.enterprise.yml up -d --scale kainella-payment-service=2
```

### Load Balancing

- Nginx upstream configuration
- Health check integration
- Failover support
- Session affinity

## Backup & Recovery

### Database Backups

```bash
# MongoDB backup
docker exec kainella-mongodb mongodump --out /backup

# Redis backup
docker exec kainella-redis redis-cli BGSAVE
```

### Configuration Backups

```bash
# Backup configuration files
tar -czf kainella-config-backup.tar.gz redis/ mongodb/ rabbitmq/ monitoring/
```

## Troubleshooting

### Common Issues

1. **Service won't start**

   ```bash
   # Check logs
   docker-compose -f docker-compose.enterprise.yml logs [service-name]

   # Check resource usage
   docker stats
   ```

2. **Database connection issues**

   ```bash
   # Check database health
   docker exec kainella-mongodb mongosh --eval "db.adminCommand('ping')"
   docker exec kainella-redis redis-cli ping
   ```

3. **Memory issues**

   ```bash
   # Check memory usage
   docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

   # Restart services
   docker-compose -f docker-compose.enterprise.yml restart
   ```

### Log Analysis

```bash
# View all logs
docker-compose -f docker-compose.enterprise.yml logs

# View specific service logs
docker-compose -f docker-compose.enterprise.yml logs kainella-auth-service

# Follow logs in real-time
docker-compose -f docker-compose.enterprise.yml logs -f --tail=100
```

## Production Deployment

### Environment Preparation

1. Set up SSL certificates
2. Configure firewall rules
3. Set up monitoring alerts
4. Implement backup strategies
5. Configure log rotation

### Security Checklist

- [ ] Change all default passwords
- [ ] Enable SSL/TLS encryption
- [ ] Configure firewall rules
- [ ] Set up monitoring alerts
- [ ] Implement backup procedures
- [ ] Regular security updates
- [ ] Penetration testing

### Performance Tuning

- [ ] Optimize database queries
- [ ] Configure caching strategies
- [ ] Set up CDN
- [ ] Monitor resource usage
- [ ] Implement auto-scaling

## Support

For technical support and questions:

- **Documentation**: Check individual service README files
- **Issues**: Create GitHub issues for bugs and feature requests
- **Monitoring**: Use Grafana dashboards for system health
- **Logs**: Check service logs for debugging information

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This is an enterprise-grade configuration designed for production use. Ensure proper security measures and monitoring are in place before deploying to production environments.
