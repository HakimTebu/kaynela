# 🏆 Kaynela Farms Loyalty Service

**Enterprise-Grade Loyalty Program Engine for Agritourism Platform**

## 🏗️ Overview

The **Loyalty Service** is a core microservice in the Kaynela Farms Ltd Agritourism Platform, responsible for managing all loyalty program operations. This enterprise-grade service handles points earning, redemption, tier management, and rewards with comprehensive validation, caching, and **100% loosely coupled event-driven architecture**.

### Enterprise Features

- **100% Loosely Coupled**: Zero direct service dependencies
- **Event-Driven Architecture**: RabbitMQ exchanges for optimal routing
- **Advanced Tier System**: Bronze, Silver, Gold, Platinum, Diamond tiers
- **Smart Points Calculation**: Multipliers based on tier and activity type
- **Redis Caching**: High-performance data access
- **Comprehensive Analytics**: Business intelligence and reporting

### Data Flow

1. **Client Request** → **API Gateway** → **Loyalty Service**
2. **Validation** → **Business Logic** → **Database Operations**
3. **Event Publishing** → **RabbitMQ Exchanges** → **Other Services**
4. **Response** → **Client** with **Caching** for performance

## 🔄 RabbitMQ Exchange Architecture

### **Exchange Types Used**

1. **DIRECT Exchange** (`kainella.loyalty.events`): Point-to-point messaging for loyalty operations
2. **TOPIC Exchange** (`kainella.user.events`): Pattern-based routing for user-related events
3. **TOPIC Exchange** (`kainella.booking.events`): Pattern-based routing for booking events
4. **FANOUT Exchange** (`kainella.notification.events`): Broadcast notifications to all consumers
5. **TOPIC Exchange** (`kainella.system.events`): System-wide events and maintenance

### **Routing Patterns**

```
# DIRECT Exchange Examples
loyalty.points.earned      # Points earned from activity
loyalty.points.redeemed    # Points redeemed for reward
loyalty.tier.upgraded      # User tier upgraded
loyalty.reward.created     # New reward created
loyalty.reward.redeemed    # Reward redeemed

# TOPIC Exchange Examples
user.loyalty.updated.*     # User loyalty data updated
booking.completed.loyalty.* # Booking completed with loyalty
system.loyalty.*           # Loyalty system events
```

### **Benefits**

- **Zero Dependencies**: Services never call each other directly
- **Flexible Routing**: Services can bind to specific patterns
- **High Performance**: Optimized routing with proper exchange types
- **Easy Scaling**: Add new services without modifying existing ones
- **Fault Tolerance**: Service failures don't cascade

## 🏆 Loyalty Program Features

### **Tier System**

| Tier | Points Required | Multiplier | Benefits |
|------|----------------|------------|----------|
| **Bronze** | 0-999 | 1.0x | Basic rewards access |
| **Silver** | 1,000-4,999 | 1.2x | Enhanced rewards, 20% bonus |
| **Gold** | 5,000-19,999 | 1.5x | Premium rewards, 50% bonus, VIP support |
| **Platinum** | 20,000-99,999 | 2.0x | Elite rewards, 100% bonus, concierge service |
| **Diamond** | 100,000+ | 3.0x | Ultimate rewards, 200% bonus, personal manager |

### **Points Earning Sources**

- **Bookings**: Lodge, activity, and event reservations
- **Farm Visits**: On-site experiences and tours
- **Reviews**: Feedback and ratings
- **Referrals**: Bringing new customers
- **Social Sharing**: Marketing engagement
- **Birthday/Anniversary**: Special occasion bonuses

### **Reward Categories**

- **Discounts**: Percentage and fixed amount reductions
- **Free Items**: Complimentary products or services
- **Upgrades**: Enhanced experiences
- **Experiences**: Unique farm activities
- **Merchandise**: Branded products

## 🛠️ Tech Stack

### **Core Technologies**
- **Runtime**: Node.js 18 (Alpine)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for high-performance data access
- **Message Broker**: RabbitMQ with exchange-based routing
- **Logging**: Winston with daily rotation

### **Security & Performance**
- **Authentication**: JWT-based middleware
- **Rate Limiting**: Redis-backed with multiple strategies
- **Input Validation**: Express-validator with custom rules
- **Audit Logging**: Comprehensive action tracking
- **Error Handling**: Structured error responses

### **Monitoring & Observability**
- **Health Checks**: Docker health check integration
- **Request Tracing**: Unique request ID generation
- **Performance Metrics**: Response time and throughput tracking
- **Structured Logging**: JSON format with correlation IDs

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- MongoDB 6+
- Redis 6+
- RabbitMQ 3.8+

### **Local Development**

```bash
# Clone the repository
git clone <repository-url>
cd services/loyalty-service

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### **Docker Deployment**

```bash
# Build the image
docker build -t kainella-loyalty-service .

# Run the container
docker run -p 3004:3004 kainella-loyalty-service

# Or use Docker Compose
docker-compose up loyalty-service
```

## ⚙️ Configuration

### **Environment Variables**

```bash
# Server Configuration
PORT=3004
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/kainella_loyalty
MONGODB_MAX_POOL_SIZE=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_CONNECT_TIMEOUT=10000

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_HEARTBEAT=60
RABBITMQ_PREFETCH=1

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Rate Limiting
RATE_LIMIT_MAX=100
POINTS_EARNING_LIMIT=20
REWARDS_REDEMPTION_LIMIT=5
TIER_UPGRADE_LIMIT=3

# Logging
LOG_LEVEL=info
```

## 📡 API Endpoints

### **Loyalty Points Management**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/loyalty/points/earn` | Add loyalty points | ✅ |
| `GET` | `/api/loyalty/summary/:userId` | Get user loyalty summary | ✅ |
| `GET` | `/api/loyalty/history/:userId` | Get user loyalty history | ✅ |

### **Reward Management**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/rewards` | Create new reward | ✅ Admin |
| `GET` | `/api/rewards` | Get all rewards | ✅ |
| `GET` | `/api/rewards/:rewardId` | Get reward details | ✅ |
| `POST` | `/api/rewards/:rewardId/redeem` | Redeem reward | ✅ |

### **Tier Management**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/tiers` | Get all loyalty tiers | ✅ |
| `GET` | `/api/tiers/:tier` | Get tier details | ✅ |
| `POST` | `/api/tiers/upgrade/:userId` | Check and upgrade tier | ✅ |

### **Analytics (Admin Only)**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/analytics/overview` | Overall loyalty statistics | ✅ Admin |
| `GET` | `/api/analytics/points/earning` | Points earning analytics | ✅ Admin |
| `GET` | `/api/analytics/users/engagement` | User engagement metrics | ✅ Admin |

## 📊 Data Models

### **LoyaltyPoints Schema**

```javascript
{
  userId: ObjectId,           // Reference to user
  points: Number,             // Points amount
  transactionType: String,    // earned, redeemed, transferred, etc.
  source: String,             // booking, farm_visit, referral, etc.
  reason: String,             // Description of points action
  tierAtTime: String,         // User's tier when points were earned
  multiplier: Number,         // Applied multiplier
  basePoints: Number,         // Original points before multiplier
  bonusPoints: Number,        // Additional points from multiplier
  totalPoints: Number,        // Final points (base + bonus)
  expiresAt: Date,            // Points expiry date
  isExpired: Boolean,         // Expiry status
  metadata: Object            // Additional context
}
```

### **Reward Schema**

```javascript
{
  name: String,               // Reward name
  description: String,        // Detailed description
  category: String,           // discount, free_item, upgrade, etc.
  pointsCost: Number,         // Points required for redemption
  tierRequirement: String,    // Minimum tier required
  isActive: Boolean,          // Availability status
  isLimited: Boolean,         // Limited quantity flag
  maxRedemptions: Number,     // Maximum redemption limit
  currentRedemptions: Number, // Current redemption count
  expiryDate: Date,           // Reward expiry date
  metadata: Object            // Additional properties
}
```

## 🔄 Event System

### **Published Events**

| Event Type | Exchange | Routing Key | Description |
|------------|----------|-------------|-------------|
| `LOYALTY_POINTS_EARNED` | `kainella.loyalty.events` | `loyalty.points.earned` | Points earned by user |
| `LOYALTY_POINTS_REDEEMED` | `kainella.loyalty.events` | `loyalty.points.redeemed` | Points redeemed for reward |
| `LOYALTY_TIER_UPGRADED` | `kainella.loyalty.events` | `loyalty.tier.upgraded` | User tier upgraded |
| `REWARD_CREATED` | `kainella.loyalty.events` | `loyalty.reward.created` | New reward created |
| `REWARD_REDEEMED` | `kainella.loyalty.events` | `loyalty.reward.redeemed` | Reward redeemed by user |

### **Consumed Events**

| Event Type | Exchange | Routing Key | Description |
|------------|----------|-------------|-------------|
| `USER_REGISTERED` | `kainella.user.events` | `user.registered` | New user registration |
| `BOOKING_COMPLETED` | `kainella.booking.events` | `booking.completed` | Booking marked as completed |
| `USER_PROFILE_UPDATED` | `kainella.user.events` | `user.profile.updated` | User profile updated |

## 🚦 Rate Limiting

### **Rate Limit Strategies**

- **General API**: 100 requests per 15 minutes per IP
- **Points Earning**: 20 operations per hour per user
- **Reward Redemption**: 5 redemptions per hour per user
- **Tier Upgrade**: 3 attempts per day per user
- **Admin Operations**: 100 operations per hour per IP

### **Rate Limit Headers**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 900
```

## 🔒 Security Features

### **Authentication & Authorization**

- **JWT Validation**: Secure token-based authentication
- **Role-Based Access**: Admin, super_admin, and user roles
- **Resource Ownership**: Users can only access their own data
- **Admin Privileges**: Administrative operations restricted

### **Input Validation**

- **Request Validation**: Comprehensive input sanitization
- **Business Rules**: Points limits and tier requirements
- **Data Integrity**: MongoDB schema validation
- **SQL Injection Protection**: Mongoose ODM protection

### **Audit & Compliance**

- **Action Logging**: All operations logged with context
- **User Tracking**: Request correlation and user identification
- **Compliance Ready**: GDPR and data protection compliant
- **Audit Trail**: Complete history of all changes

## 📈 Performance & Scalability

### **Caching Strategy**

- **Redis Caching**: User points and loyalty summary
- **Cache TTL**: Configurable time-to-live values
- **Cache Invalidation**: Automatic cache updates on changes
- **Performance Boost**: 10x faster data access

### **Database Optimization**

- **Indexed Queries**: Optimized for common operations
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Aggregation pipelines for analytics
- **Sharding Ready**: Horizontal scaling support

### **Horizontal Scaling**

- **Stateless Design**: No local state dependencies
- **Load Balancing**: Multiple service instances
- **Database Sharding**: Distribute data across clusters
- **Message Queue**: Asynchronous processing

## 🧪 Testing

### **Test Commands**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- --grep "loyalty points"
```

### **Test Coverage**

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Database Tests**: MongoDB operation testing
- **Event Tests**: RabbitMQ event testing

## 📊 Monitoring & Health Checks

### **Health Check Endpoint**

```bash
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Kaynela Farms Loyalty Service is healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "requestId": "uuid-here"
}
```

### **Docker Health Check**

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1
```

### **Monitoring Metrics**

- **Service Uptime**: Continuous health monitoring
- **Response Times**: API performance tracking
- **Error Rates**: Failure rate monitoring
- **Resource Usage**: CPU, memory, and database metrics

## 🚀 Deployment

### **Docker Compose**

```yaml
loyalty-service:
  build:
    context: ./services/loyalty-service
    dockerfile: Dockerfile
  ports:
    - "3004:3004"
  environment:
    - NODE_ENV=production
    - MONGODB_URI=mongodb://mongodb:27017/kainella_loyalty
    - REDIS_URL=redis://redis:6379
    - RABBITMQ_URL=amqp://rabbitmq:5672
  depends_on:
    - mongodb
    - redis
    - rabbitmq
  healthcheck:
    test: ["CMD", "node", "healthcheck.js"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### **Kubernetes Deployment**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loyalty-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: loyalty-service
  template:
    metadata:
      labels:
        app: loyalty-service
    spec:
      containers:
      - name: loyalty-service
        image: kainella-loyalty-service:latest
        ports:
        - containerPort: 3004
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3004
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3004
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 🔧 Development Guidelines

### **Code Style**

- **ESLint**: Enforce code quality standards
- **Prettier**: Consistent code formatting
- **TypeScript**: Consider migration for type safety
- **JSDoc**: Comprehensive documentation

### **Git Workflow**

- **Feature Branches**: Develop new features in separate branches
- **Pull Requests**: Code review before merging
- **Commit Messages**: Conventional commit format
- **Version Tags**: Semantic versioning

### **Error Handling**

- **Structured Errors**: Consistent error response format
- **Logging**: Comprehensive error logging with context
- **User Feedback**: User-friendly error messages
- **Recovery**: Graceful degradation and retry logic

## 🐛 Troubleshooting

### **Common Issues**

1. **MongoDB Connection Failed**
   - Check MongoDB service status
   - Verify connection string and credentials
   - Check network connectivity

2. **Redis Connection Failed**
   - Verify Redis service is running
   - Check connection URL format
   - Ensure Redis port is accessible

3. **RabbitMQ Connection Failed**
   - Check RabbitMQ service status
   - Verify exchange setup
   - Check queue bindings

4. **High Response Times**
   - Monitor database query performance
   - Check Redis cache hit rates
   - Review RabbitMQ message processing

### **Debug Mode**

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Enable verbose RabbitMQ logging
RABBITMQ_DEBUG=true npm start
```

### **Log Analysis**

```bash
# View service logs
tail -f logs/loyalty-service-2024-01-15.log

# View error logs
tail -f logs/loyalty-service-error-2024-01-15.log

# Search for specific errors
grep "ERROR" logs/loyalty-service-*.log
```

## 📚 API Documentation

### **Request/Response Examples**

#### **Earn Loyalty Points**

```bash
POST /api/loyalty/points/earn
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "points": 100,
  "reason": "Farm visit completed",
  "source": "farm_visit",
  "metadata": {
    "visitId": "visit123",
    "activityType": "guided_tour"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Loyalty points earned successfully",
  "data": {
    "pointsEarned": 150,
    "basePoints": 100,
    "bonusPoints": 50,
    "tierMultiplier": 1.5,
    "sourceMultiplier": 1.0,
    "totalMultiplier": 1.5,
    "newTotalPoints": 1250
  },
  "requestId": "uuid-here"
}
```

#### **Get User Loyalty Summary**

```bash
GET /api/loyalty/summary/507f1f77bcf86cd799439011
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "totalPoints": 1250,
    "totalBasePoints": 1000,
    "totalBonusPoints": 250,
    "pointsByTier": {
      "bronze": 500,
      "silver": 750
    },
    "expiringPoints": 2,
    "expiringPointsList": [...],
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "requestId": "uuid-here"
}
```

## 🤝 Contributing

### **Development Setup**

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes and test thoroughly**
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Create Pull Request**

### **Code Standards**

- **Follow existing patterns** and architecture
- **Write comprehensive tests** for new features
- **Update documentation** for API changes
- **Ensure backward compatibility** when possible

### **Testing Requirements**

- **Unit tests** for all new functions
- **Integration tests** for API endpoints
- **Performance tests** for critical paths
- **Security tests** for authentication flows

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### **Getting Help**

- **Documentation**: Check this README and API docs
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions
- **Email**: Contact the development team

### **Emergency Contacts**

- **Technical Issues**: tech-support@kaynela.com
- **Business Questions**: business@kaynela.com
- **Security Issues**: security@kaynela.com

---

**Built with ❤️ by the Kaynela Farms Development Team**

*Enterprise-Grade Loyalty Service - Powering the Future of Agritourism*
