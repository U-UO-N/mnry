import mysql from 'mysql2/promise';

async function updateUsers() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root123456',
    database: 'ecommerce_miniprogram'
  });

  console.log('=== Updating all users balance to 20 yuan and points to 0 ===');
  
  // Update all users: balance = 20 (yuan), points = 0
  const [result] = await connection.execute('UPDATE users SET balance = 20, points = 0');
  console.log('Updated rows:', (result as any).affectedRows);

  console.log('\n=== Verifying update ===');
  const [users] = await connection.execute('SELECT id, nickname, balance, points FROM users');
  console.log(users);

  await connection.end();
}

updateUsers().catch(console.error);
