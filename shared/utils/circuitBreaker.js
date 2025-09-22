/**
 * Circuit Breaker Pattern Implementation
 * Provides fault tolerance and prevents cascading failures
 */

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    // Configuration
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000; // 60 seconds
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 60 seconds
    this.expectedErrors = options.expectedErrors || [];
    
    // Metrics
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.lastStateChange = Date.now();
  }

  async execute(operation, fallback = null) {
    this.totalRequests++;
    
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        this.failedRequests++;
        return fallback ? fallback() : this.handleFallback();
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      return fallback ? fallback(error) : this.handleFallback();
    }
  }

  onSuccess() {
    this.successfulRequests++;
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastStateChange = Date.now();
  }

  onFailure(error) {
    this.failedRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.timeout;
      this.lastStateChange = Date.now();
      console.warn(`Circuit breaker '${this.name}' opened due to ${this.failureCount} failures`);
    }
  }

  handleFallback() {
    throw new Error(`Circuit breaker '${this.name}' is open - service unavailable`);
  }

  getStats() {
    const successRate = this.totalRequests > 0 ? (this.successfulRequests / this.totalRequests) * 100 : 0;
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      successRate: `${successRate.toFixed(2)}%`,
      lastStateChange: this.lastStateChange,
      uptime: Date.now() - this.lastStateChange
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.lastStateChange = Date.now();
  }
}

// Circuit breaker instances for different services
const circuitBreakers = {
  database: new CircuitBreaker('database', { failureThreshold: 3, timeout: 30000 }),
  redis: new CircuitBreaker('redis', { failureThreshold: 3, timeout: 30000 }),
  rabbitmq: new CircuitBreaker('rabbitmq', { failureThreshold: 3, timeout: 30000 }),
  externalAPI: new CircuitBreaker('externalAPI', { failureThreshold: 5, timeout: 60000 })
};

module.exports = { CircuitBreaker, circuitBreakers }; 