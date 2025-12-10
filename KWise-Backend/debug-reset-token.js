const db = require('./config/db');
const { cleanResetCode, validateResetCode } = require('./utils/passwordResetEnhanced');

async function debugResetToken() {
  try {
    const testToken = '162023';
    console.log('1. Testing token validation:');
    console.log('   Token:', testToken);
    console.log('   validateResetCode result:', validateResetCode(testToken));
    console.log('   cleanResetCode result:', cleanResetCode(testToken));
    
    console.log('\n2. Database token check:');
    const result = await db.query(
      `SELECT id, name, email, reference_email, password_reset_token, 
              password_reset_expires, reset_status, reset_attempts,
              password_reset_expires > NOW() as not_expired,
              EXTRACT(EPOCH FROM (password_reset_expires - NOW())) as seconds_until_expire
       FROM users 
       WHERE password_reset_token = $1`,
      [testToken]
    );
    
    console.log('   Database result:', result.rows);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\n3. Token analysis:');
      console.log('   Token matches:', user.password_reset_token === testToken);
      console.log('   Not expired:', user.not_expired);
      console.log('   Reset status:', user.reset_status);
      console.log('   Reset attempts:', user.reset_attempts);
      console.log('   Seconds until expire:', user.seconds_until_expire);
      
      console.log('\n4. Full findByValidResetToken query test:');
      const validResult = await db.query(
        `SELECT id, name, email, password, role, reference_email, 
                password_reset_token, password_reset_expires, reset_attempts, reset_status
         FROM users 
         WHERE password_reset_token = $1 
           AND password_reset_expires > NOW()
           AND reset_status = 'pending'
           AND reset_attempts < 5`,
        [testToken.trim()]
      );
      
      console.log('   Valid token query result:', validResult.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
      if (validResult.rows.length > 0) {
        console.log('   User found:', { 
          id: validResult.rows[0].id, 
          name: validResult.rows[0].name, 
          email: validResult.rows[0].email 
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debugResetToken();