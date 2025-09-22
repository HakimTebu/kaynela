# Kaynela Farms Notification Service

An enterprise-grade, multi-channel notification service built for the Kaynela Farms agritourism platform. This service provides comprehensive notification capabilities across email, SMS, and push notifications with advanced templating, delivery tracking, and analytics.

## 🚀 Features

### Multi-Channel Support
- **Email Notifications**: SMTP, SendGrid integration with HTML/text templates
- **SMS Notifications**: Twilio, AWS SNS integration with OTP support
- **Push Notifications**: Firebase Cloud Messaging, Apple Push Notification Service
- **In-App Notifications**: Real-time notifications within the platform

### Advanced Templating System
- **Dynamic Templates**: Variable substitution with validation
- **Multi-Language Support**: Localized notification content
- **Version Control**: Template versioning and rollback capabilities
- **Approval Workflows**: Template approval and review processes

### Enterprise Features
- **100% Loosely Coupled**: Event-driven architecture with RabbitMQ
- **Scalable Architecture**: Microservices design with horizontal scaling
- **Comprehensive Monitoring**: Prometheus metrics, health checks, logging
- **Security First**: JWT authentication, rate limiting, input validation
- **Audit Logging**: Complete audit trail for compliance

### Delivery Management
- **Smart Retry Logic**: Configurable retry attempts with exponential backoff
- **Dead Letter Queues**: Failed notification handling and analysis
- **Delivery Tracking**: Real-time delivery status and analytics
- **Bulk Operations**: Efficient bulk notification processing

## 🏗️ Architecture

### Service Components
```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Service                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Email    │  │     SMS     │  │    Push     │        │
│  │ Controller │  │ Controller  │  │ Controller  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Templates  │  │   Models    │  │ Middleware  │        │
│  │ Controller │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  RabbitMQ  │  │  MongoDB    │  │    Redis    │        │
│  │   Events   │  │   Storage   │  │    Cache    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (sharded)
- **Cache**: Redis Cluster
- **Message Broker**: RabbitMQ
- **Authentication**: JWT/OAuth 2.0
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston with daily rotation
- **Containerization**: Docker + Kubernetes

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- MongoDB 6.0+
- Redis 6.0+
- RabbitMQ 3.8+
- Docker (optional)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/kaynela-farms/notification-service.git
cd notification-service
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp env.example .env
# Edit .env with your configuration
```

### 4. Start the Service
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🐳 Docker Deployment

### Build Image
```bash
npm run docker:build
```

### Run Container
```bash
npm run docker:run
```

### Docker Compose
```yaml
version: '3.8'
services:
  notification-service:
    build: .
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/kainella_notifications
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
    depends_on:
      - mongo
      - redis
      - rabbitmq
```

## 🔧 Configuration

### Environment Variables

#### Service Configuration
- `PORT`: Service port (default: 3006)
- `NODE_ENV`: Environment (development/production)
- `SERVICE_NAME`: Service identifier

#### Database Configuration
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `RABBITMQ_URL`: RabbitMQ connection string

#### Provider Configuration
- **Email**: SMTP settings, SendGrid API key
- **SMS**: Twilio credentials, AWS SNS configuration
- **Push**: Firebase project settings, APNS configuration

#### Security Configuration
- `JWT_SECRET`: JWT signing secret
- `WEBHOOK_SECRET`: Webhook verification secret
- `ALLOWED_ORIGINS`: CORS allowed origins

## 📡 API Endpoints

### Core Notifications
```
GET    /api/notifications              # List notifications
GET    /api/notifications/:id          # Get notification
PATCH  /api/notifications/:id/read    # Mark as read
DELETE /api/notifications/:id          # Delete notification
```

### Email Notifications
```
POST   /api/email/send                 # Send email
POST   /api/email/bulk                 # Bulk email
GET    /api/email/history              # Email history
POST   /api/email/:id/resend          # Resend failed email
```

### SMS Notifications
```
POST   /api/sms/send                   # Send SMS
POST   /api/sms/bulk                   # Bulk SMS
POST   /api/sms/otp                    # Send OTP
GET    /api/sms/history                # SMS history
```

### Push Notifications
```
POST   /api/push/send                  # Send push notification
POST   /api/push/bulk                  # Bulk push
POST   /api/push/devices/register      # Register device
GET    /api/push/devices/:userId       # Get user devices
```

### Templates
```
GET    /api/templates                  # List templates
POST   /api/templates                  # Create template
PUT    /api/templates/:id              # Update template
DELETE /api/templates/:id              # Delete template
POST   /api/templates/:id/preview      # Preview template
```

## 🔌 Event-Driven Architecture

### RabbitMQ Exchanges
- **`kainella.notification.events`**: Direct exchange for notification events
- **`kainella.user.events`**: Topic exchange for user-related events
- **`kainella.booking.events`**: Topic exchange for booking events
- **`kainella.system.events`**: Topic exchange for system events

### Published Events
```javascript
// Notification sent
{
  eventType: "NOTIFICATION_SENT",
  notificationId: "507f1f77bcf86cd799439011",
  channel: "email",
  userId: "507f1f77bcf86cd799439012",
  timestamp: "2024-01-01T00:00:00.000Z"
}

// Notification failed
{
  eventType: "NOTIFICATION_FAILED",
  notificationId: "507f1f77bcf86cd799439011",
  error: "SMTP connection failed",
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

### Consumed Events
- `user.registered`: New user registration
- `booking.completed`: Booking completion
- `user.profile.updated`: Profile updates
- `system.maintenance`: System maintenance

## 📊 Monitoring & Observability

### Health Checks
```bash
# Service health
GET /health

# Response format
{
  "success": true,
  "message": "Kaynela Farms Notification Service is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### Metrics (Prometheus)
- `notification_sent_total`: Total notifications sent
- `notification_failed_total`: Total failed notifications
- `notification_delivery_duration`: Delivery duration histogram
- `queue_size`: Current queue sizes
- `provider_errors`: Provider error counts

### Logging
- **Structured Logging**: JSON format with correlation IDs
- **Daily Rotation**: Automatic log file rotation
- **Log Levels**: Error, Warn, Info, Debug
- **Audit Logging**: Complete action tracking

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- API key management for providers
- Webhook signature verification

### Rate Limiting
- Per-user rate limiting
- Per-endpoint rate limiting
- Redis-backed rate limiting
- Configurable limits per channel

### Input Validation
- Request payload validation
- Template variable validation
- SQL injection prevention
- XSS protection

## 🚀 Performance & Scalability

### Caching Strategy
- Redis-based caching for templates
- User preference caching
- Rate limit caching
- Template rendering cache

### Horizontal Scaling
- Stateless service design
- Load balancer support
- Database connection pooling
- Queue-based processing

### Optimization Features
- Bulk notification processing
- Async notification sending
- Connection pooling
- Efficient database queries

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Categories
- Unit tests for controllers
- Integration tests for services
- API endpoint tests
- Database operation tests
- Event handling tests

## 📈 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database connections secured
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Log aggregation setup
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan ready

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: kainella-notification-service:latest
        ports:
        - containerPort: 3006
        env:
        - name: NODE_ENV
          value: "production"
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review and merge

### Code Standards
- ESLint configuration
- Prettier formatting
- Conventional commits
- Comprehensive testing
- Documentation updates

## 📚 Documentation

### Additional Resources
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Contributing Guidelines](./docs/CONTRIBUTING.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check the docs folder
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Email**: support@kaynela-farms.com

### Community
- **Slack**: Join our development community
- **Discord**: Real-time chat and support
- **Blog**: Technical articles and updates

---

**Built with ❤️ by the Kaynela Farms Development Team**

*Empowering agritourism through innovative technology*
