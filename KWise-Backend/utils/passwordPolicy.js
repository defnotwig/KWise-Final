// Centralized password policy validation
// Returns { valid: boolean, message?: string }
// Policy: min 8 chars, at least one letter, one number, optional special, no spaces, not common list

const COMMON_PASSWORDS = new Set([
  'password','123456','123456789','qwerty','letmein','welcome','admin','abc123','iloveyou','111111','123123'
]);

function validatePassword(pw) {
  if (typeof pw !== 'string' || !pw) return { valid: false, message: 'Password required' };
  if (pw.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return { valid: false, message: 'Password must include letters and numbers' };
  if (/\s/.test(pw)) return { valid: false, message: 'Password cannot contain spaces' };
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) return { valid: false, message: 'Password too common' };
  return { valid: true };
}

module.exports = { validatePassword };