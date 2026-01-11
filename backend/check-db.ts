import mysql from 'mysql2/promise';

async function checkDB() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root123456',
    database: 'ecommerce_miniprogram'
  });

  console.log('=== Products Table Schema ===');
  const [columns] = await connection.execute('DESCRIBE products');
  console.log(columns);

  console.log('\n=== Sample Product ===');
  const [products] = await connection.execute('SELECT id, name, detail_images FROM products LIMIT 1');
  console.log(products);

  await connection.end();
}

checkDB().catch(console.error);
