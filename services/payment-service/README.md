# Kaynela Farms Payment Service

A comprehensive, enterprise-grade payment processing microservice for the Kaynela Farms agritourism platform, supporting multiple payment methods, providers, and currencies.

## 🚀 Features

### Core Payment Processing
- **Multi-Provider Support**: Stripe, Razorpay, M-Pesa, Airtel Money, Bank Transfers
- **Payment Methods**: Credit/Debit Cards, Mobile Money, Bank Transfers, Cash
- **Multi-Currency**: USD, EUR, GBP, KES, UGX, TZS
- **Real-time Processing**: Asynchronous payment processing with webhook support

### Security & Compliance
- **PCI-DSS Compliant**: Secure card data handling
- **Webhook Verification**: HMAC signature validation for all webhooks
- **Rate Limiting**: Redis-backed rate limiting with different tiers
- **Audit Logging**: Comprehensive audit trail for all payment operations

### Business Logic
- **Refund Management**: Full and partial refunds with approval workflows
- **Payment Methods**: User payment method management and verification
- **Analytics**: Comprehensive payment analytics and reporting
- **Export Capabilities**: CSV and JSON export for all analytics data

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18 with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for caching and rate limiting
- **Message Broker**: RabbitMQ for event-driven architecture
- **Logging**: Winston with daily rotation and JSON format
- **Monitoring**: Prometheus metrics and health checks

### Service Structure
```
src/
├── controllers/          # Business logic controllers
├── models/              # MongoDB schemas and models
├── routes/              # API route definitions
├── middlewares/         # Custom middleware functions
├── services/            # External service integrations
├── utils/               # Utility functions and helpers
└── config/              # Configuration files
```

## 📋 Prerequisites

- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+
- RabbitMQ 3.8+
- Docker & Docker Compose (for containerized deployment)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   cd services/payment-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the service**
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build the image**
   ```bash
   docker build -t kainella-payment-service .
   ```

2. **Run the container**
   ```bash
   docker run -p 3003:3003 --env-file .env kainella-payment-service
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3003` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `RABBITMQ_URL` | RabbitMQ connection string | - |
| `JWT_SECRET` | JWT signing secret | - |

### Payment Provider Configuration

#### Stripe
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Razorpay
```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

#### M-Pesa
```env
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_BUSINESS_SHORT_CODE=...
MPESA_WEBHOOK_SECRET=...
```

## 📡 API Endpoints

### Payments
- `POST /api/payments` - Create payment
- `GET /api/payments/:id` - Get payment details
- `GET /api/payments` - List user payments
- `PATCH /api/payments/:id/capture` - Capture payment
- `PATCH /api/payments/:id/cancel` - Cancel payment
- `POST /api/payments/:id/retry` - Retry failed payment

### Transactions
- `GET /api/transactions/:id` - Get transaction details
- `GET /api/transactions` - List user transactions
- `GET /api/transactions/stats/overview` - Transaction statistics
- `GET /api/transactions/search` - Search transactions
- `GET /api/transactions/export` - Export transaction data

### Refunds
- `POST /api/refunds` - Create refund request
- `GET /api/refunds/:id` - Get refund details
- `GET /api/refunds` - List user refunds
- `PATCH /api/refunds/:id/approve` - Approve refund (admin)
- `PATCH /api/refunds/:id/cancel` - Cancel refund

### Payment Methods
- `POST /api/payment-methods` - Add payment method
- `GET /api/payment-methods/:id` - Get payment method
- `GET /api/payment-methods` - List user payment methods
- `PUT /api/payment-methods/:id` - Update payment method
- `PATCH /api/payment-methods/:id/default` - Set as default
- `DELETE /api/payment-methods/:id` - Remove payment method

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook
- `POST /api/webhooks/razorpay` - Razorpay webhook
- `POST /api/webhooks/mpesa` - M-Pesa webhook
- `POST /api/webhooks/generic` - Generic webhook

### Analytics
- `GET /api/analytics/overview` - Payment analytics overview
- `GET /api/analytics/trends` - Payment trends
- `GET /api/analytics/methods` - Payment method analytics
- `GET /api/analytics/refunds` - Refund analytics
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/performance` - Performance metrics
- `GET /api/analytics/export` - Export analytics data

## 🔌 Event-Driven Architecture

### RabbitMQ Exchanges

| Exchange | Type | Purpose |
|----------|------|---------|
| `kainella.payment.events` | DIRECT | Payment-related events |
| `kainella.user.events` | TOPIC | User-related events |
| `kainella.booking.events` | TOPIC | Booking-related events |
| `kainella.notification.events` | FANOUT | Notification events |
| `kainella.system.events` | HEADERS | System-wide events |

### Published Events

- `payment.created` - New payment created
- `payment.processed` - Payment processing started
- `payment.completed` - Payment completed successfully
- `payment.failed` - Payment failed
- `payment.cancelled` - Payment cancelled
- `refund.created` - Refund request created
- `refund.processed` - Refund processing started
- `refund.completed` - Refund completed
- `payment_method.created` - New payment method added
- `payment_method.updated` - Payment method updated

### Consumed Events

- `user.registered` - New user registration
- `user.profile.updated` - User profile updates
- `booking.completed` - Booking completion
- `booking.cancelled` - Booking cancellation
- `loyalty.tier.upgraded` - Loyalty tier changes

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Resource ownership validation
- Optional authentication for webhooks

### Rate Limiting
- General API rate limiting
- Payment-specific rate limiting
- Refund request rate limiting
- Webhook rate limiting
- Admin operations rate limiting

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection via Helmet.js

## 📊 Monitoring & Observability

### Health Checks
- Service health endpoint: `/health`
- Database connectivity checks
- Redis connectivity checks
- RabbitMQ connectivity checks

### Metrics
- Prometheus metrics endpoint
- Request/response metrics
- Database query metrics
- Payment processing metrics

### Logging
- Structured JSON logging
- Daily log rotation
- Error tracking and monitoring
- Audit trail logging

## 🚀 Performance Features

### Caching Strategy
- Redis-based caching for frequently accessed data
- Payment method caching
- Analytics result caching
- Configurable TTL for different data types

### Database Optimization
- Indexed queries for common operations
- Aggregation pipelines for analytics
- Connection pooling
- Query optimization

### Async Processing
- Non-blocking payment processing
- Webhook processing
- Event publishing
- Background job processing

## 🧪 Testing

### Test Types
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for payment flows
- Load testing for performance validation

### Test Commands
```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests only
npm run test:integration # Run integration tests
npm run test:coverage # Run tests with coverage
```

## 📦 Deployment

### Docker Compose
```yaml
payment-service:
  build: ./services/payment-service
  ports:
    - "3003:3003"
  environment:
    - NODE_ENV=production
    - MONGODB_URI=mongodb://mongodb:27017/kainella-payments
  depends_on:
    - mongodb
    - redis
    - rabbitmq
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kainella-payment-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kainella-payment-service
  template:
    metadata:
      labels:
        app: kainella-payment-service
    spec:
      containers:
      - name: payment-service
        image: kainella-payment-service:latest
        ports:
        - containerPort: 3003
```

## 🔄 CI/CD

### GitHub Actions
- Automated testing on pull requests
- Docker image building and pushing
- Deployment to staging/production
- Security scanning and vulnerability checks

### Deployment Pipeline
1. Code commit triggers CI pipeline
2. Automated testing and quality checks
3. Docker image building and security scanning
4. Deployment to staging environment
5. Automated testing in staging
6. Production deployment with rollback capability

## 📚 Documentation

### API Documentation
- OpenAPI/Swagger specification
- Interactive API explorer
- Request/response examples
- Error code documentation

### Developer Guides
- Getting started guide
- Payment integration guide
- Webhook implementation guide
- Testing guide

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- ESLint configuration
- Prettier formatting
- Conventional commit messages
- Code review requirements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the documentation
- Search existing issues
- Create a new issue with detailed information
- Contact the development team

### Issue Reporting
When reporting issues, please include:
- Service version
- Environment details
- Steps to reproduce
- Expected vs actual behavior
- Logs and error messages

---

**Kaynela Farms Payment Service** - Enterprise-grade payment processing for agritourism excellence.
