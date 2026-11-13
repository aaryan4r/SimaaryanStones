'use strict';
const { randomBytes, scryptSync } = require('node:crypto');
let value = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { value += chunk; if (value.length > 1024) process.exit(1); });
process.stdin.on('end', () => {
  const password = value.replace(/\r?\n$/, '');
  if (password.length < 14 || password.length > 256) { console.error('Use a unique password of 14–256 characters.'); process.exitCode = 1; return; }
  const salt = randomBytes(16);
  console.log(`scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`);
});
