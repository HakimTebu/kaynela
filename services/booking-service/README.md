# Kaynela Farms Ltd - Booking Service

## 🏗️ Overview

The **Booking Service** is a core microservice in the Kaynela Farms Ltd Agritourism Platform, responsible for managing all booking and reservation operations. This enterprise-grade service handles lodging, activities, events, farm tours, and package bookings with comprehensive validation, caching, and **100% loosely coupled event-driven architecture**.

## 🚀 Features

### Core Functionality

- **Multi-type Bookings**: Lodging, activities, events, farm tours, and packages
- **Real-time Availability**: Dynamic availability checking and conflict resolution
- **Flexible Pricing**: Base price, taxes, fees, discounts, and multiple currencies
- **Participant Management**: Adults, children, and seniors with special requirements
- **Cancellation Policies**: Flexible, moderate, strict, and non-refundable options

### Enterprise Features

- **100% Loosely Coupled**: Zero direct service dependencies
- **Event-Driven Architecture**: RabbitMQ exchanges for optimal routing
- **Redis Caching**: High-performance data caching with TTL management
- **Comprehensive Validation**: Input validation with detailed error messages
- **Role-Based Access Control**: Admin, staff, and customer permissions
- **Audit Logging**: Complete audit trail for all operations
- **Rate Limiting**: Intelligent rate limiting with Redis backend

### Agritourism Specific

- **Farm Activities**: Tours, animal feeding, crop picking, cooking classes
- **Lodging Types**: Farmhouse, cottage, glamping, camping, guesthouse
- **Event Management**: Workshops, festivals, celebrations, educational events
- **Special Requirements**: Dietary restrictions, accessibility needs, medical conditions

## 🏗️ Architecture

### Service Structure

```
src/
├── controllers/          # Business logic controllers
├── models/              # Mongoose data models
├── routes/              # Express route definitions
├── services/            # External service integrations
├── middlewares/         # Custom middleware functions
├── utils/               # Utility functions and helpers
├── config/              # Configuration management
└── constants/           # Application constants
```

### Data Flow

1. **Client Request** → **API Gateway** → **Booking Service**
2. **Validation** → **Business Logic** → **Database Operations**
3. **Event Publishing** → **RabbitMQ Exchanges** → **Other Services**
4. **Response** → **Client** with **Caching** for performance

### **100% Loose Coupling Implementation**

The service achieves **zero dependencies** through:

- **No Direct Service Calls**: Services never call each other directly
- **Event-Driven Communication**: All communication via RabbitMQ exchanges
- **Exchange Types**: Proper use of TOPIC, DIRECT, and FANOUT exchanges
- **Async Processing**: Non-blocking event processing
- **Service Discovery**: No hardcoded service URLs

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis with TTL management
- **Message Broker**: RabbitMQ with proper exchange types
- **Logging**: Winston with daily rotation
- **Validation**: Express-validator with custom rules
- **Security**: Helmet.js, CORS, Rate limiting
- **Monitoring**: Health checks, metrics, graceful shutdown

## 🔄 RabbitMQ Exchange Architecture

### **Exchange Types Used**

1. **TOPIC Exchange** (`kainella.booking.events`): Pattern-based routing for flexible event distribution
2. **DIRECT Exchange** (`kainella.payment.events`): Point-to-point messaging for exact routing
3. **DIRECT Exchange** (`kainella.loyalty.events`): Direct communication with loyalty service
4. **FANOUT Exchange** (`kainella.notification.events`): Broadcast notifications to all consumers
5. **TOPIC Exchange** (`kainella.system.events`): System-wide events and maintenance

### **Routing Patterns**

```
# TOPIC Exchange Examples
booking.created.*      # New booking created
booking.confirmed.*    # Booking confirmed by admin
payment.processed      # Payment successful (DIRECT)
loyalty.points.earned  # Points earned (DIRECT)
""                     # All notifications (FANOUT)
```

### **Benefits**

- **Zero Dependencies**: Services never call each other directly
- **Flexible Routing**: Services can bind to specific patterns
- **High Performance**: Optimized routing with proper exchange types
- **Easy Scaling**: Add new services without modifying existing ones
- **Fault Tolerance**: Service failures don't cascade

_For detailed RabbitMQ architecture, see [RABBITMQ_ARCHITECTURE.md](./RABBITMQ_ARCHITECTURE.md)_

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- MongoDB 5+
- Redis 6+
- RabbitMQ 3.8+

### Local Development

```bash
# Clone the repository
git clone https://github.com/kainella/microservices.git
cd services/booking-service

# Install dependencies
npm install

# Set environment variables
cp env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build the image
npm run docker:build

# Run the container
npm run docker:run
```

## ⚙️ Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3002
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/kainella_bookings
MONGODB_MAX_POOL_SIZE=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_CONNECT_TIMEOUT=10000

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_HEARTBEAT=60

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_MAX=100
BOOKING_CREATION_LIMIT=5
PAYMENT_LIMIT=10
```

### Configuration File

The service uses a centralized configuration system in `src/config/index.js` that provides:

- Environment-specific settings
- Business logic configuration
- External service endpoints
- Security parameters
- Cache TTL values

## 🔌 API Endpoints

### Authentication Required

All endpoints require valid JWT authentication via `Authorization: Bearer <token>` header.

### Booking Management

```
POST   /api/bookings              # Create new booking
GET    /api/bookings              # List user bookings with filters
GET    /api/bookings/:id          # Get specific booking
PUT    /api/bookings/:id          # Update booking
POST   /api/bookings/:id/cancel   # Cancel booking
POST   /api/bookings/:id/confirm  # Confirm booking (admin)
POST   /api/bookings/:id/complete # Complete booking (admin)
DELETE /api/bookings/:id          # Delete booking (admin)
GET    /api/bookings/stats        # Get booking statistics
```

### Lodging Operations

```
GET    /api/lodging/availability  # Check lodging availability
GET    /api/lodging/types         # Get accommodation types
```

### Activity Operations

```
GET    /api/activities/types      # Get activity types
GET    /api/activities/schedule   # Get activity schedule
```

### Event Operations

```
GET    /api/events/types          # Get event types
GET    /api/events/upcoming       # Get upcoming events
```

## 📊 Data Models

### Booking Schema

The core `Booking` model includes:

- **Basic Info**: ID, type, status, dates, duration
- **Participants**: Adults, children, seniors with counts
- **Pricing**: Base price, taxes, fees, discounts, total
- **Type-specific Data**: Lodging, activity, event, package details
- **Special Requirements**: Dietary, accessibility, medical needs
- **Payment Info**: Method, status, transaction details
- **Cancellation**: Policy, fees, reasons, timestamps
- **Communication**: Email, SMS, reminder tracking
- **Metadata**: Source, tags, notes, audit trail

### Virtual Fields

- `totalParticipants`: Calculated participant count
- `durationInDays`: Calculated duration in days

### Methods

- `canBeCancelled()`: Check if booking can be cancelled
- `calculateCancellationFee()`: Calculate refund amount
- `findActiveBookings()`: Find user's active bookings
- `findUpcomingBookings()`: Find upcoming bookings

## 🔄 Event System

### Published Events

- `BOOKING_CREATED`: New booking created
- `BOOKING_CONFIRMED`: Booking confirmed by admin
- `BOOKING_COMPLETED`: Booking marked as completed
- `BOOKING_CANCELLED`: Booking cancelled
- `BOOKING_UPDATED`: Booking details updated
- `LODGING_AVAILABILITY_UPDATED`: Lodging availability changed
- `ACTIVITY_SCHEDULED`: New activity scheduled
- `EVENT_CREATED`: New event created
- `PAYMENT_PROCESSED`: Payment successful
- `PAYMENT_FAILED`: Payment failed
- `LOYALTY_POINTS_EARNED`: Points earned from booking
- `NOTIFICATION_SENT`: Notification dispatched

### Consumed Events

- `PAYMENT_PROCESSED`: Update booking payment status
- `LOYALTY_POINTS_EARNED`: Track loyalty program activity
- `SYSTEM_EVENTS`: Handle system-wide operations

## 🚦 Rate Limiting

### Limits Applied

- **General API**: 100 requests per 15 minutes per IP
- **Booking Creation**: 5 bookings per hour per user
- **Payment Operations**: 10 attempts per hour per user
- **Sensitive Operations**: 10 requests per 15 minutes per IP

### Rate Limit Headers

- `X-RateLimit-Limit`: Request limit for the window
- `X-RateLimit-Remaining`: Remaining requests in the window
- `X-RateLimit-Reset`: Time when the limit resets

## 🔒 Security Features

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (customer, staff, admin, super_admin)
- Resource ownership validation
- Admin-only operations protection

### Input Validation

- Comprehensive request validation
- SQL injection prevention
- XSS protection
- Data sanitization

### Security Headers

- Helmet.js security headers
- CORS configuration
- Rate limiting
- Request ID tracking

## 📈 Performance & Scalability

### Caching Strategy

- **Redis Caching**: Frequently accessed data
- **TTL Management**: Automatic cache expiration
- **Cache Invalidation**: Smart cache updates
- **Performance Metrics**: Cache hit/miss tracking

### Database Optimization

- **Indexing**: Strategic database indexes
- **Connection Pooling**: Optimized MongoDB connections
- **Query Optimization**: Efficient aggregation pipelines
- **Data Pagination**: Smart result limiting

### Horizontal Scaling

- **Stateless Design**: No session storage
- **Load Balancer Ready**: Multiple instance support
- **Database Sharding**: MongoDB sharding support
- **Microservice Architecture**: Independent scaling

## 🧪 Testing

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Model Tests**: Database operation testing
- **Middleware Tests**: Custom middleware testing

## 📊 Monitoring & Health

### Health Check Endpoint

```
GET /health
```

Returns service status, uptime, environment, and version information.

### Metrics

- Request count and response times
- Database connection status
- Cache hit/miss ratios
- Error rates and types
- Business metrics (bookings, revenue)

### Logging

- **Structured Logging**: JSON format with metadata
- **Log Rotation**: Daily log files with size limits
- **Log Levels**: Error, warn, info, debug
- **Request Tracing**: Unique request IDs for debugging

## 🚀 Deployment

### Docker Compose

```yaml
kainella-booking-service:
  build: ./services/booking-service
  ports:
    - "3002:3002"
  environment:
    - MONGODB_URI=mongodb://mongodb:27017/kainella_bookings
    - REDIS_URL=redis://redis:6379
    - RABBITMQ_URL=amqp://rabbitmq:5672
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
  name: kainella-booking-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kainella-booking-service
  template:
    metadata:
      labels:
        app: kainella-booking-service
    spec:
      containers:
        - name: booking-service
          image: kainella-booking-service:latest
          ports:
            - containerPort: 3002
          env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: uri
```

## 🔧 Development

### Code Standards

- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **JSDoc**: API documentation
- **TypeScript**: Type safety (future enhancement)

### Git Workflow

- **Feature Branches**: `feature/booking-cancellation`
- **Bug Fixes**: `fix/payment-validation`
- **Hotfixes**: `hotfix/security-patch`
- **Pull Requests**: Code review required

### Development Guidelines

- Follow RESTful API design principles
- Implement comprehensive error handling
- Add logging for all business operations
- Write tests for new functionality
- Update documentation for API changes

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**: Check connection string and network
2. **Redis Connection Error**: Verify Redis server status
3. **RabbitMQ Connection Lost**: Check message broker health
4. **Rate Limit Exceeded**: Review rate limiting configuration
5. **Validation Errors**: Check request payload format

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Check service health
curl http://localhost:3002/health

# Monitor logs
docker logs kainella-booking-service
```

## 📚 API Documentation

### Request Examples

```bash
# Create a lodging booking
curl -X POST http://localhost:3002/api/bookings \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingType": "lodging",
    "startDate": "2024-02-01T10:00:00Z",
    "endDate": "2024-02-03T10:00:00Z",
    "duration": 2,
    "participants": {
      "adults": 2,
      "children": 1
    },
    "basePrice": 15000,
    "currency": "KES",
    "lodging": {
      "accommodationType": "farmhouse",
      "checkInTime": "14:00",
      "checkOutTime": "11:00"
    },
    "payment": {
      "paymentMethod": "mobile_money"
    }
  }'
```

### Response Format

```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "id": "507f1f77bcf86cd799439011",
      "bookingId": "KF-1706784000000-ABC123DEF",
      "status": "pending",
      "totalAmount": 15000,
      "startDate": "2024-02-01T10:00:00.000Z",
      "endDate": "2024-02-03T10:00:00.000Z"
    }
  },
  "requestId": "uuid-request-id"
}
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

### Code Review Process

- All changes require review
- Tests must pass
- Documentation must be updated
- Security implications reviewed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check this README and API docs
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions
- **Email**: Contact the development team

### Team Contact

- **Lead Developer**: [Your Name]
- **Project Manager**: [PM Name]
- **DevOps Engineer**: [DevOps Name]

---

_Built with ❤️ by the Kaynela Farms Development Team_
_Enterprise-Grade Agritourism Booking Platform with 100% Loose Coupling_
