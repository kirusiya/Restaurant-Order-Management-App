const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log(hashedPassword);
}

// Example usage:
// hashPassword('your_password_here');
// Run this script with `node scripts/hash-password.js`
// and copy the output hash to your database for initial admin user.
