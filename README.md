# 🌾 Kaynela Farms Ltd - Enterprise-Grade Agritourism Platform

A distributed, loosely coupled, scalable architecture for agritourism booking & loyalty platform built with Node.js, RabbitMQ, Elasticsearch, Redis, MongoDB, and industry-best practices for enterprise-grade reliability.

## 🏗️ System Overview

Kaynela Farms Ltd platform supports:

- ✅ **Online Booking & Reservations** (Lodging, Activities, Events)
- ✅ **Event Ticketing with QR Codes**
- ✅ **Multi-Payment Integration** (Mobile Money, Visa/Mastercard)
- ✅ **Admin & User Dashboards**
- ✅ **Loyalty Program Engine**
- ✅ **Real-time Analytics & Reporting**

## 🏛️ High-Level Architecture

**100% Loosely Coupled Microservices with Event-Driven Design**

### Core Layers:

1. **Client Layer** (Web, Mobile, Admin Dashboard)
2. **API Gateway** (Nginx)
3. **Microservices** (Node.js, Docker, Kubernetes)
4. **Message Broker** (RabbitMQ for async workflows)
5. **Data Layer** (MongoDB, Redis, Elasticsearch)
6. **Monitoring & Observability** (Prometheus, Grafana, Winston)

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- MongoDB 5.0+
- Redis 6+
- RabbitMQ 3.9+

### 1. Clone Repository

```bash
git clone https://github.com/kainella/microservices.git
cd kainella
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up kainella-auth-service

# View logs
docker-compose logs -f kainella-auth-service
```

### 4. Health Checks

```bash
# Auth Service
curl http://localhost:3001/health

# Booking Service
curl http://localhost:3002/health

# Payment Service
curl http://localhost:3003/health

# Loyalty Service
curl http://localhost:3004/health
```

## 🏢 Microservices Architecture

### Service Portfolio

| Service                  | Port | Purpose                        | Tech Stack                     |
| ------------------------ | ---- | ------------------------------ | ------------------------------ |
| **Auth Service**         | 3001 | User authentication & profiles | NestJS, MongoDB, Redis         |
| **Booking Service**      | 3002 | Lodge/activity reservations    | Express, TypeScript, MongoDB   |
| **Payment Service**      | 3003 | Mobile Money, Card processing  | Express, Razorpay API, MongoDB |
| **Loyalty Service**      | 3004 | Points, rewards logic          | NestJS, Redis (Sorted Sets)    |
| **Ticketing Service**    | 3005 | QR ticket generation           | NestJS, MongoDB, Redis         |
| **Notification Service** | 3006 | Email, SMS, Push alerts        | Node.js, Firebase              |
| **Reporting Service**    | 3007 | Analytics, dashboards          | NestJS, Elasticsearch          |

### Event-Driven Workflows (RabbitMQ)

**Decoupled communication between services:**

- Event Sourcing for critical workflows
- Dead Letter Queues (DLQ) for fault tolerance
- Async processing for scalability

**Key Events:**

- `booking_created` → Payment processing
- `payment_processed` → Ticket generation
- `booking_completed` → Loyalty points
- `loyalty_tier_upgraded` → Notifications

## 📁 Project Structure

```
kainella/
├── 📁 .github/              # CI/CD workflows
├── 📁 config/               # Environment variables
├── 📁 services/             # Microservices
│   ├── 📁 auth-service/     # Authentication & profiles
│   ├── 📁 booking-service/  # Reservations & bookings
│   ├── 📁 payment-service/  # Payment processing
│   ├── 📁 loyalty-service/  # Loyalty program
│   ├── 📁 ticketing-service/# QR codes & tickets
│   ├── 📁 notification-service/ # Multi-channel alerts
│   └── 📁 reporting-service/# Analytics & BI
├── 📁 shared/               # Common libraries
│   ├── 📁 constants/        # RabbitMQ queues, configs
│   └── 📁 utils/            # Shared utilities
├── 📁 gateway/              # Nginx API Gateway
├── 📁 rabbitmq/             # Message broker configs
├── 📁 monitoring/           # Prometheus, Grafana
├── 📁 mongodb_data/         # Database storage
├── 📁 logs/                 # Service logs
├── docker-compose.yml       # Multi-container orchestration
└── README.md                # This file
```

## 🔐 Authentication & Security

### JWT/OAuth 2.0 Implementation

- **Stateless authentication** with JWT tokens
- **OAuth 2.0** integration (Google, Apple)
- **Two-factor authentication** (2FA) support
- **Role-based access control** (RBAC)

### Security Features

- **Rate limiting** (Redis-backed)
- **Helmet.js** security headers
- **CORS** configuration
- **Input validation** & sanitization
- **PCI-DSS compliance** for payments

## 💳 Payment Integration

### Supported Payment Methods

- **Mobile Money** (M-Pesa, Airtel Money)
- **Credit/Debit Cards** (Visa, Mastercard)
- **Bank Transfers**
- **Cash on Arrival**

### Payment Providers

- **Stripe** for international cards
- **Razorpay** for local payments
- **Custom mobile money APIs**

## 🎫 Loyalty Program

### Tier System

- **Bronze** (0-499 points)
- **Silver** (500-1,999 points)
- **Gold** (2,000-4,999 points)
- **Platinum** (5,000-9,999 points)
- **Diamond** (10,000+ points)

### Points Earning

- **Lodging**: 1.5x multiplier
- **Activities**: 1.2x multiplier
- **Events**: 1.3x multiplier
- **Farm Tours**: 1.4x multiplier
- **Special bonuses** for seasonal activities

## 📊 Analytics & Reporting

### Real-time Metrics

- **Booking analytics** by type, season, location
- **Revenue tracking** with trend analysis
- **Customer behavior** insights
- **Operational efficiency** metrics

### Data Sources

- **MongoDB** for transactional data
- **Elasticsearch** for search & analytics
- **Redis** for real-time caching
- **Prometheus** for system metrics

## 🚀 Scalability & Performance

### Expected Throughput (Enterprise-Grade)

| Component           | Expected QPS | Optimization                  |
| ------------------- | ------------ | ----------------------------- |
| **Booking Service** | 5,000+ QPS   | Redis caching, RabbitMQ async |
| **Payment Service** | 3,000+ QPS   | Idempotency keys, retries     |
| **Loyalty Service** | 2,000+ QPS   | Redis Sorted Sets             |

### Performance Optimizations

- **Redis caching** for frequent queries
- **Elasticsearch indexing** for fast search
- **CDN** for static assets
- **Database sharding** for horizontal scaling

## 🔧 Development

### Local Development

```bash
# Install dependencies for a service
cd services/auth-service
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/kainella
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# JWT
JWT_SECRET=your-secret-key

# Payment Providers
STRIPE_SECRET_KEY=sk_test_...
RAZORPAY_KEY_ID=rzp_test_...
```

## 🧪 Testing

### Test Coverage

```bash
# Run all tests
npm run test:coverage

# Run specific service tests
cd services/auth-service
npm run test:coverage
```

### Test Types

- **Unit tests** with Jest
- **Integration tests** for APIs
- **End-to-end tests** for workflows
- **Load testing** with k6

## 📈 Monitoring & Observability

### Metrics Collection

- **Prometheus** for system metrics
- **Grafana** for visualization
- **Custom business metrics**

### Logging

- **Winston** for structured logging
- **ELK Stack** for log aggregation
- **Request tracing** with unique IDs

### Health Checks

- **Service health** endpoints
- **Dependency health** monitoring
- **Automated alerting**

## 🚢 Deployment

### Docker Deployment

```bash
# Build all services
docker-compose build

# Deploy to production
docker-compose -f docker-compose.production.yml up -d
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Scale services
kubectl scale deployment kainella-booking-service --replicas=3
```

### CI/CD Pipeline

- **GitHub Actions** for automated testing
- **Docker Hub** for image registry
- **Terraform** for infrastructure as code

## 🌍 Environment Configuration

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=info
```

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Code Standards

- **ESLint** for code quality
- **Prettier** for formatting
- **TypeScript** for type safety
- **JSDoc** for documentation

## 📚 API Documentation

### Swagger/OpenAPI

- **Interactive API docs** at `/api-docs`
- **Request/response examples**
- **Authentication details**

### Postman Collections

- **Pre-configured requests**
- **Environment variables**
- **Test scripts**

## 🔍 Troubleshooting

### Common Issues

1. **Service won't start**: Check environment variables
2. **Database connection**: Verify MongoDB status
3. **RabbitMQ errors**: Check queue configuration
4. **Payment failures**: Validate API keys

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug

# View service logs
docker-compose logs -f service-name
```

## 📞 Support

### Contact Information

- **Email**: dev@kainellafarms.com
- **Slack**: #kainella-dev
- **Documentation**: https://docs.kainellafarms.com

### Issue Reporting

- **GitHub Issues** for bug reports
- **Feature requests** welcome
- **Security issues**: security@kainellafarms.com

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Node.js** community for the excellent runtime
- **MongoDB** for the flexible database
- **RabbitMQ** for reliable messaging
- **Elasticsearch** for powerful search capabilities

---

**Built with ❤️ by the Kaynela Farms Development Team**

_Empowering agritourism through technology_
