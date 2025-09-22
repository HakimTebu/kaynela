# Kaynela Farms Ticketing Service

A comprehensive event ticketing and QR code generation microservice for the Kaynela Farms Agritourism Platform. This service provides enterprise-grade ticketing management, QR code generation, event management, and seamless integration with other platform services.

## 🚀 Features

### Core Ticketing
- **Ticket Generation & Management**: Create, update, and manage tickets with multiple types and pricing tiers
- **QR Code Generation**: Generate customizable QR codes in multiple formats (PNG, SVG, PDF)
- **Ticket Validation**: Real-time ticket scanning and validation with location tracking
- **Seat Management**: Assign and manage seating arrangements for events
- **Transfer & Refund**: Handle ticket transfers and refunds with approval workflows

### Event Management
- **Event Creation**: Comprehensive event setup with detailed information
- **Venue Management**: Venue details, capacity, and accessibility information
- **Schedule Management**: Multi-day events with detailed scheduling
- **Recurring Events**: Support for recurring event patterns
- **Event Categories**: Agriculture, tourism, education, entertainment, and more

### Advanced Features
- **Accessibility Support**: Wheelchair access, hearing/visual assistance, dietary restrictions
- **Weather Considerations**: Rain dates, indoor backup options, weather policies
- **Insurance & Permits**: Track insurance coverage and required permits
- **Marketing Tools**: Campaign management, social media integration, hashtags
- **Analytics & Reporting**: Comprehensive event and ticket analytics

### Security & Compliance
- **JWT Authentication**: Secure user authentication and authorization
- **Role-Based Access Control**: Granular permissions for different user roles
- **Audit Logging**: Complete audit trail for all operations
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Data Encryption**: Secure storage and transmission of sensitive data

## 🏗️ Architecture

### Service Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway  │────│ Ticketing       │────│   MongoDB       │
│                 │    │ Service         │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              │
                       ┌─────────────────┐
                       │   RabbitMQ      │
                       │   Message Bus   │
                       └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   Redis Cache   │
                       └─────────────────┘
```

### Exchange Types Used
- **Direct Exchange**: For specific routing (ticket events, event management)
- **Fanout Exchange**: For broadcasting (notifications, system alerts)
- **Topic Exchange**: For pattern-based routing (analytics, audit logs)
- **Headers Exchange**: For complex routing (loyalty events, reporting)

### Data Models
- **Ticket**: Comprehensive ticket information with validation history
- **Event**: Detailed event management with venue and scheduling
- **QRCode**: QR code generation and usage tracking
- **User**: User authentication and role management

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Message Queue**: RabbitMQ with multiple exchange types
- **Cache**: Redis for session and data caching
- **Authentication**: JWT with role-based access control
- **Validation**: Express-validator with custom validation rules
- **Logging**: Winston with daily rotation and structured logging
- **Rate Limiting**: Express-rate-limit with Redis backend
- **Security**: Helmet, CORS, input sanitization
- **QR Code Generation**: qrcode library with canvas support

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- MongoDB 5.0+
- Redis 6+
- RabbitMQ 3.8+
- Docker and Docker Compose (for containerized deployment)

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd services/ticketing-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the service**
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build the image**
   ```bash
   docker build -t kainella-ticketing-service .
   ```

2. **Run the container**
   ```bash
   docker run -p 3005:3005 kainella-ticketing-service
   ```

### Docker Compose

```bash
# From the root directory
docker-compose up kainella-ticketing-service
```

## 🔧 Configuration

### Environment Variables

```bash
# Service Configuration
PORT=3005
NODE_ENV=development
SERVICE_NAME=kainella-ticketing-service

# Database
MONGODB_URI=mongodb://user:pass@localhost:27017/kainella-ticketing
MONGODB_MAX_POOL_SIZE=10
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_SOCKET_TIMEOUT=45000

# Redis
REDIS_URL=redis://localhost:6379
REDIS_CONNECT_TIMEOUT=10000

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@localhost:5672
RABBITMQ_HEARTBEAT=60

# JWT
JWT_SECRET=your-secret-key

# Rate Limiting
RATE_LIMIT_MAX=100
STRICT_RATE_LIMIT_MAX=10
TICKET_GENERATION_LIMIT=50
QRCODE_GENERATION_LIMIT=100
EVENT_CREATION_LIMIT=10
TICKET_VALIDATION_LIMIT=200
ADMIN_OPERATIONS_LIMIT=50

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 📚 API Endpoints

### Health Check
- `GET /health` - Service health status

### Tickets
- `POST /api/tickets` - Create a new ticket
- `GET /api/tickets` - List tickets with filtering
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `POST /api/tickets/:id/validate` - Validate ticket
- `POST /api/tickets/:id/transfer` - Request ticket transfer
- `POST /api/tickets/:id/refund` - Request refund

### Events
- `POST /api/events` - Create a new event
- `GET /api/events` - List events with filtering
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/publish` - Publish event
- `POST /api/events/:id/activate` - Activate event
- `GET /api/events/search` - Search events

### QR Codes
- `POST /api/qr-codes` - Generate QR code
- `GET /api/qr-codes/:id` - Get QR code details
- `PUT /api/qr-codes/:id` - Update QR code
- `DELETE /api/qr-codes/:id` - Delete QR code
- `POST /api/qr-codes/:id/regenerate` - Regenerate QR code

### Validation
- `POST /api/validation/scan` - Scan and validate ticket
- `GET /api/validation/history` - Get validation history

### Analytics
- `GET /api/analytics/tickets` - Ticket analytics
- `GET /api/analytics/events` - Event analytics
- `GET /api/analytics/users` - User analytics

## 🔐 Authentication & Authorization

### User Roles
- **admin**: Full access to all operations
- **super_admin**: System-level operations
- **event_organizer**: Event management operations
- **manager**: Limited administrative operations
- **user**: Basic ticket operations

### Permission Matrix

| Operation | admin | super_admin | event_organizer | manager | user |
|-----------|-------|-------------|------------------|---------|------|
| Create Event | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update Event | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Event | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Ticket | ✅ | ✅ | ✅ | ✅ | ✅ |
| Validate Ticket | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ | ❌ |

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```json
{
  "success": true,
  "message": "Kaynela Farms Ticketing Service is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "requestId": "uuid-here"
}
```

### Metrics
- Request count and response times
- Database connection status
- Redis connection status
- RabbitMQ connection status
- Memory and CPU usage
- Error rates and types

## 🚨 Error Handling

### Error Types
- **ValidationError**: Input validation failures
- **NotFoundError**: Resource not found
- **UnauthorizedError**: Authentication required
- **ForbiddenError**: Insufficient permissions
- **ConflictError**: Resource conflicts
- **RateLimitError**: Rate limit exceeded
- **TicketGenerationError**: Ticket creation failures
- **QRCodeGenerationError**: QR code generation failures

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details",
  "requestId": "uuid-here",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔄 Event-Driven Architecture

### RabbitMQ Exchanges

#### Direct Exchange
- **ticket.events**: Ticket-related events
- **event.management**: Event management operations
- **payment.integration**: Payment processing events

#### Fanout Exchange
- **notifications.fanout**: Broadcast notifications
- **system.alerts**: System-wide alerts

#### Topic Exchange
- **analytics.topic**: Analytics data routing
- **audit.topic**: Audit log routing
- **business.topic**: Business event routing

#### Headers Exchange
- **loyalty.headers**: Loyalty program events
- **reporting.headers**: Reporting and analytics events

### Event Types
- Ticket created, updated, cancelled, validated
- Event created, updated, cancelled, activated
- QR code generated, validated, expired
- Payment processed, refunded
- Loyalty points earned, redeemed

## 🧪 Testing

### Test Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "Ticket creation"
```

### Test Coverage
- Unit tests for models and services
- Integration tests for API endpoints
- End-to-end tests for complete workflows
- Performance and load testing

## 📈 Performance & Scalability

### Optimization Strategies
- Database indexing for common queries
- Redis caching for frequently accessed data
- Connection pooling for database connections
- Asynchronous processing for heavy operations
- Rate limiting to prevent abuse

### Scaling Considerations
- Horizontal scaling with load balancers
- Database sharding for large datasets
- Message queue clustering
- Cache distribution across multiple nodes
- Microservice decomposition

## 🔒 Security

### Security Features
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Audit logging

### Best Practices
- Regular security updates
- Dependency vulnerability scanning
- Secure coding practices
- Penetration testing
- Security monitoring and alerting

## 📝 Logging

### Log Levels
- **error**: Error conditions
- **warn**: Warning conditions
- **info**: General information
- **debug**: Debug information
- **verbose**: Verbose information

### Log Formats
- Structured JSON logging
- Request ID tracking
- User context information
- Performance metrics
- Error stack traces

### Log Rotation
- Daily log rotation
- Compressed archive storage
- Configurable retention periods
- Separate error and access logs

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database connections secured
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backup strategies implemented
- [ ] Disaster recovery plan ready
- [ ] Performance testing completed
- [ ] Security audit performed

### Deployment Strategies
- Blue-green deployment
- Rolling updates
- Canary releases
- Feature flags
- A/B testing

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- Follow ESLint configuration
- Use Prettier for code formatting
- Write comprehensive tests
- Document new features
- Follow commit message conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the documentation
- Search existing issues
- Create a new issue
- Contact the development team

### Reporting Issues
When reporting issues, please include:
- Service version
- Environment details
- Steps to reproduce
- Expected vs actual behavior
- Logs and error messages

---

**Kaynela Farms Ticketing Service** - Empowering agritourism excellence through innovative ticketing solutions.
