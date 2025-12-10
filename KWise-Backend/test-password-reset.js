const db = require('./config/db');
const User = require('./models/User');

async function testPasswordReset() {
  try {
    console.log('Testing password reset functionality...');
    
    // Check if user exists
    const user = await User.findByEmail('ludwigrivera13@gmail.com');
    if (!user) {
      console.log('❌ User not found with that email');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      reference_email: user.reference_email,
      reset_token: user.password_reset_token,
      reset_expires: user.password_reset_expires,
      reset_attempts: user.reset_attempts,
      reset_status: user.reset_status
    });
    
    // Check if there's an active reset token
    if (user.password_reset_token) {
      const isExpired = new Date(user.password_reset_expires) < new Date();
      console.log('Reset token status:', {
        token_exists: !!user.password_reset_token,
        expires_at: user.password_reset_expires,
        is_expired: isExpired,
        attempts: user.reset_attempts,
        status: user.reset_status
      });
      
      // Test token validation
      const validUser = await User.findByValidResetToken(user.password_reset_token);
      console.log('Token validation result:', validUser ? 'VALID' : 'INVALID');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPasswordReset();