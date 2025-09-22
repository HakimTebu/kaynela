/**
 * Enterprise-Grade Metrics Collection System
 * Provides comprehensive monitoring for production readiness
 */

const { circuitBreakers } = require("./circuitBreaker");

class EnterpriseMetrics {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.startTime = Date.now();
    this.requestCounts = {
      total: 0,
      successful: 0,
      failed: 0,
      byEndpoint: {},
    };
    this.responseTimes = [];
    this.errorRates = [];
    this.memoryUsage = [];
    this.cpuUsage = [];

    // Start metrics collection
    this.startMetricsCollection();
  }

  recordRequest(endpoint, method, statusCode, responseTime) {
    this.requestCounts.total++;

    if (statusCode >= 200 && statusCode < 400) {
      this.requestCounts.successful++;
    } else {
      this.requestCounts.failed++;
    }

    // Track by endpoint
    const key = `${method} ${endpoint}`;
    if (!this.requestCounts.byEndpoint[key]) {
      this.requestCounts.byEndpoint[key] = {
        total: 0,
        successful: 0,
        failed: 0,
      };
    }
    this.requestCounts.byEndpoint[key].total++;

    if (statusCode >= 200 && statusCode < 400) {
      this.requestCounts.byEndpoint[key].successful++;
    } else {
      this.requestCounts.byEndpoint[key].failed++;
    }

    // Record response time
    this.responseTimes.push({
      timestamp: Date.now(),
      endpoint,
      method,
      responseTime,
      statusCode,
    });

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  recordError(error, context = {}) {
    this.errorRates.push({
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack,
      context,
    });

    // Keep only last 100 errors
    if (this.errorRates.length > 100) {
      this.errorRates.shift();
    }
  }

  startMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.memoryUsage.push({
        timestamp: Date.now(),
        ...process.memoryUsage(),
      });

      this.cpuUsage.push({
        timestamp: Date.now(),
        ...process.cpuUsage(),
      });

      // Keep only last 1000 metrics
      if (this.memoryUsage.length > 1000) {
        this.memoryUsage.shift();
      }
      if (this.cpuUsage.length > 1000) {
        this.cpuUsage.shift();
      }
    }, 30000);
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const successRate =
      this.requestCounts.total > 0
        ? (this.requestCounts.successful / this.requestCounts.total) * 100
        : 0;

    const avgResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, rt) => sum + rt.responseTime, 0) /
          this.responseTimes.length
        : 0;

    const recentResponseTimes = this.responseTimes
      .filter((rt) => Date.now() - rt.timestamp < 300000) // Last 5 minutes
      .map((rt) => rt.responseTime);

    const p95ResponseTime =
      recentResponseTimes.length > 0
        ? this.calculatePercentile(recentResponseTimes, 95)
        : 0;

    const p99ResponseTime =
      recentResponseTimes.length > 0
        ? this.calculatePercentile(recentResponseTimes, 99)
        : 0;

    return {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      uptime: {
        milliseconds: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000),
      },
      requests: {
        total: this.requestCounts.total,
        successful: this.requestCounts.successful,
        failed: this.requestCounts.failed,
        successRate: `${successRate.toFixed(2)}%`,
        byEndpoint: this.requestCounts.byEndpoint,
      },
      performance: {
        averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        p95ResponseTime: `${p95ResponseTime.toFixed(2)}ms`,
        p99ResponseTime: `${p99ResponseTime.toFixed(2)}ms`,
        recentRequests: recentResponseTimes.length,
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        memoryTrend: this.getMemoryTrend(),
        cpuTrend: this.getCpuTrend(),
      },
      errors: {
        total: this.errorRates.length,
        recent: this.errorRates.filter((e) => Date.now() - e.timestamp < 300000)
          .length,
      },
      circuitBreakers: Object.keys(circuitBreakers).reduce((acc, key) => {
        acc[key] = circuitBreakers[key].getStats();
        return acc;
      }, {}),
    };
  }

  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getMemoryTrend() {
    if (this.memoryUsage.length < 2) return "stable";
    const recent = this.memoryUsage.slice(-10);
    const first = recent[0].heapUsed;
    const last = recent[recent.length - 1].heapUsed;
    const change = ((last - first) / first) * 100;

    if (change > 10) return "increasing";
    if (change < -10) return "decreasing";
    return "stable";
  }

  getCpuTrend() {
    if (this.cpuUsage.length < 2) return "stable";
    const recent = this.cpuUsage.slice(-10);
    const first = recent[0].user + recent[0].system;
    const last =
      recent[recent.length - 1].user + recent[recent.length - 1].system;
    const change = ((last - first) / first) * 100;

    if (change > 20) return "increasing";
    if (change < -20) return "decreasing";
    return "stable";
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const successRate = parseFloat(metrics.requests.successRate);
    const avgResponseTime = parseFloat(metrics.performance.averageResponseTime);
    const errorCount = metrics.errors.recent;

    let status = "HEALTHY";
    let issues = [];

    if (successRate < 95) {
      status = "DEGRADED";
      issues.push(`Low success rate: ${successRate.toFixed(2)}%`);
    }

    if (avgResponseTime > 1000) {
      status = "DEGRADED";
      issues.push(`High response time: ${avgResponseTime.toFixed(2)}ms`);
    }

    if (errorCount > 10) {
      status = "UNHEALTHY";
      issues.push(`High error rate: ${errorCount} errors in last 5 minutes`);
    }

    return {
      status,
      issues,
      metrics: this.getMetrics(),
    };
  }
}

module.exports = EnterpriseMetrics;
