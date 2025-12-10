/**
 * Manual Circuit Breaker Reset Script
 * Use this to reset the AI circuit breaker when it's stuck in OPEN state
 */

const aiCircuitBreaker = require('./services/aiCircuitBreaker');
const logger = require('./utils/logger');

console.log('\n🔧 K-Wise Circuit Breaker Reset Tool\n');
console.log('===================================\n');

// Get current status
const status = aiCircuitBreaker.getStatus();
console.log('📊 Current Status:');
console.log(`   State: ${status.state}`);
console.log(`   Failure Count: ${status.failureCount}`);
console.log(`   Success Count: ${status.successCount}`);
console.log(`   Total Calls: ${status.metrics.totalCalls}`);
console.log(`   Success Rate: ${status.metrics.successRate}`);
console.log(`   Fallback Rate: ${status.metrics.fallbackRate}\n`);

if (status.state === 'OPEN') {
  console.log('⚠️  Circuit breaker is OPEN - Resetting...\n');
  aiCircuitBreaker.reset();
  
  const newStatus = aiCircuitBreaker.getStatus();
  console.log('✅ Circuit breaker has been reset!');
  console.log(`   New State: ${newStatus.state}`);
  console.log(`   Failure Count: ${newStatus.failureCount}\n`);
  
  logger.info('Circuit breaker manually reset via script');
  process.exit(0);
} else {
  console.log(`ℹ️  Circuit breaker is in ${status.state} state - no reset needed\n`);
  process.exit(0);
}
