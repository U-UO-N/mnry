import { getPool, closePool } from './mysql';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const migrations: { name: string; sql: string }[] = [
  {
    name: 'create_migrations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        openid VARCHAR(64) UNIQUE,
        nickname VARCHAR(64),
        avatar VARCHAR(255),
        phone VARCHAR(20),
        member_level ENUM('normal', 'vip', 'svip') DEFAULT 'normal',
        balance DECIMAL(10,2) DEFAULT 0,
        points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_openid (openid),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_categories_table',
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(64) NOT NULL,
        icon VARCHAR(255),
        parent_id VARCHAR(36),
        sort INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_parent_id (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_products_table',
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        main_image VARCHAR(255) NOT NULL,
        images JSON,
        category_id VARCHAR(36),
        description TEXT,
        detail_images JSON,
        stock INT DEFAULT 0,
        sales INT DEFAULT 0,
        status ENUM('draft', 'on_sale', 'off_sale') DEFAULT 'draft',
        sort INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category_id (category_id),
        INDEX idx_status (status),
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_favorites_table',
    sql: `
      CREATE TABLE IF NOT EXISTS favorites (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_product_id (product_id),
        UNIQUE INDEX idx_user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_browse_history_table',
    sql: `
      CREATE TABLE IF NOT EXISTS browse_history (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_product_id (product_id),
        INDEX idx_viewed_at (viewed_at),
        UNIQUE INDEX idx_user_product (user_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_product_skus_table',
    sql: `
      CREATE TABLE IF NOT EXISTS product_skus (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        spec_values JSON NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_cart_items_table',
    sql: `
      CREATE TABLE IF NOT EXISTS cart_items (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        sku_id VARCHAR(36),
        quantity INT DEFAULT 1,
        selected BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_orders_table',
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        order_no VARCHAR(32) UNIQUE NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        status ENUM('pending_payment', 'pending_shipment', 'shipped', 'completed', 'cancelled', 'refunding', 'refunded') DEFAULT 'pending_payment',
        total_amount DECIMAL(10,2) NOT NULL,
        pay_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        points_used INT DEFAULT 0,
        balance_used DECIMAL(10,2) DEFAULT 0,
        coupon_id VARCHAR(36),
        address_snapshot JSON NOT NULL,
        remark VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        shipped_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_order_no (order_no),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_order_items_table',
    sql: `
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        sku_id VARCHAR(36),
        product_name VARCHAR(128) NOT NULL,
        product_image VARCHAR(255) NOT NULL,
        spec_values JSON,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_reviews_table',
    sql: `
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        rating INT NOT NULL,
        content TEXT NOT NULL,
        images JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_order_id (order_id),
        INDEX idx_product_id (product_id),
        UNIQUE INDEX idx_order_unique (order_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        openid VARCHAR(64) UNIQUE,
        nickname VARCHAR(64),
        avatar VARCHAR(255),
        phone VARCHAR(20),
        member_level ENUM('normal', 'vip', 'svip') DEFAULT 'normal',
        balance DECIMAL(10,2) DEFAULT 0,
        points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_openid (openid),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_categories_table',
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(64) NOT NULL,
        icon VARCHAR(255),
        parent_id VARCHAR(36),
        sort INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_parent_id (parent_id),
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_products_table',
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        main_image VARCHAR(255) NOT NULL,
        images JSON,
        category_id VARCHAR(36),
        description TEXT,
        detail_images JSON,
        stock INT DEFAULT 0,
        sales INT DEFAULT 0,
        status ENUM('draft', 'on_sale', 'off_sale') DEFAULT 'draft',
        sort INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category_id (category_id),
        INDEX idx_status (status),
        INDEX idx_name (name),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_product_skus_table',
    sql: `
      CREATE TABLE IF NOT EXISTS product_skus (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        spec_values JSON NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_cart_items_table',
    sql: `
      CREATE TABLE IF NOT EXISTS cart_items (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        sku_id VARCHAR(36),
        quantity INT DEFAULT 1,
        selected BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_orders_table',
    sql: `
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        order_no VARCHAR(32) UNIQUE NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        status ENUM('pending_payment', 'pending_shipment', 'shipped', 'completed', 'cancelled', 'refunding', 'refunded') DEFAULT 'pending_payment',
        total_amount DECIMAL(10,2) NOT NULL,
        pay_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        points_used INT DEFAULT 0,
        balance_used DECIMAL(10,2) DEFAULT 0,
        coupon_id VARCHAR(36),
        address_snapshot JSON NOT NULL,
        remark VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL,
        shipped_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_order_no (order_no),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_order_items_table',
    sql: `
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        sku_id VARCHAR(36),
        product_name VARCHAR(128) NOT NULL,
        product_image VARCHAR(255) NOT NULL,
        spec_values JSON,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_logistics_table',
    sql: `
      CREATE TABLE IF NOT EXISTS logistics (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        company VARCHAR(64) NOT NULL,
        tracking_no VARCHAR(64) NOT NULL,
        status VARCHAR(32) DEFAULT 'shipped',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_tracking_no (tracking_no),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_migrations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_banners_table',
    sql: `
      CREATE TABLE IF NOT EXISTS banners (
        id VARCHAR(36) PRIMARY KEY,
        image VARCHAR(255) NOT NULL,
        link_type ENUM('product', 'category', 'url', 'none') DEFAULT 'none',
        link_value VARCHAR(255),
        sort INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active),
        INDEX idx_sort (sort)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_home_hot_products_table',
    sql: `
      CREATE TABLE IF NOT EXISTS home_hot_products (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        sort INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        INDEX idx_sort (sort),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_category_shortcuts_table',
    sql: `
      CREATE TABLE IF NOT EXISTS category_shortcuts (
        id VARCHAR(36) PRIMARY KEY,
        category_id VARCHAR(36) NOT NULL,
        name VARCHAR(64) NOT NULL,
        icon VARCHAR(255) NOT NULL,
        sort INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category_id (category_id),
        INDEX idx_sort (sort),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_payments_table',
    sql: `
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) PRIMARY KEY,
        payment_no VARCHAR(32) UNIQUE NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method ENUM('wechat', 'balance') NOT NULL,
        status ENUM('pending', 'success', 'failed', 'closed') DEFAULT 'pending',
        transaction_id VARCHAR(64),
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (user_id),
        INDEX idx_payment_no (payment_no),
        INDEX idx_status (status),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_refunds_table',
    sql: `
      CREATE TABLE IF NOT EXISTS refunds (
        id VARCHAR(36) PRIMARY KEY,
        refund_no VARCHAR(32) UNIQUE NOT NULL,
        payment_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reason VARCHAR(255),
        status ENUM('pending', 'processing', 'success', 'failed') DEFAULT 'pending',
        transaction_id VARCHAR(64),
        refunded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payment_id (payment_id),
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (user_id),
        INDEX idx_refund_no (refund_no),
        INDEX idx_status (status),
        FOREIGN KEY (payment_id) REFERENCES payments(id),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_coupons_table',
    sql: `
      CREATE TABLE IF NOT EXISTS coupons (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        type ENUM('fixed', 'percent') NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        min_amount DECIMAL(10,2) DEFAULT 0,
        total_count INT DEFAULT 0,
        used_count INT DEFAULT 0,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active),
        INDEX idx_end_time (end_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_user_coupons_table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_coupons (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        coupon_id VARCHAR(36) NOT NULL,
        status ENUM('available', 'used', 'expired') DEFAULT 'available',
        used_at TIMESTAMP NULL,
        order_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_coupon_id (coupon_id),
        INDEX idx_status (status),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_points_records_table',
    sql: `
      CREATE TABLE IF NOT EXISTS points_records (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type ENUM('check_in', 'purchase', 'exchange', 'refund', 'admin_adjust') NOT NULL,
        points INT NOT NULL,
        balance INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        related_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_balance_records_table',
    sql: `
      CREATE TABLE IF NOT EXISTS balance_records (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type ENUM('recharge', 'payment', 'refund', 'withdraw', 'commission', 'admin_adjust') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance DECIMAL(10,2) NOT NULL,
        description VARCHAR(255) NOT NULL,
        related_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_check_ins_table',
    sql: `
      CREATE TABLE IF NOT EXISTS check_ins (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        check_in_date DATE NOT NULL,
        points_earned INT NOT NULL DEFAULT 10,
        consecutive_days INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_check_in_date (check_in_date),
        UNIQUE INDEX idx_user_date (user_id, check_in_date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_exchange_items_table',
    sql: `
      CREATE TABLE IF NOT EXISTS exchange_items (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        image VARCHAR(255) NOT NULL,
        points_cost INT NOT NULL,
        stock INT DEFAULT 0,
        type ENUM('product', 'coupon') NOT NULL,
        related_id VARCHAR(36),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        sort INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_is_active (is_active),
        INDEX idx_sort (sort)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_exchange_orders_table',
    sql: `
      CREATE TABLE IF NOT EXISTS exchange_orders (
        id VARCHAR(36) PRIMARY KEY,
        order_no VARCHAR(32) UNIQUE NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        item_id VARCHAR(36) NOT NULL,
        item_name VARCHAR(128) NOT NULL,
        points_cost INT NOT NULL,
        status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_item_id (item_id),
        INDEX idx_status (status),
        INDEX idx_order_no (order_no),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES exchange_items(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: 'create_materials_table',
    sql: `
      CREATE TABLE IF NOT EXISTS materials (
        id VARCHAR(36) PRIMARY KEY,
        url VARCHAR(512) NOT NULL,
        type ENUM('image', 'video') NOT NULL,
        name VARCHAR(255) NOT NULL,
        size INT NOT NULL DEFAULT 0,
        category VARCHAR(64),
        tags JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_category (category),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
];

async function runMigrations() {
  const pool = getPool();

  try {
    logger.info('Starting database migrations...');

    // Ensure migrations table exists first
    const migrationsTableSql = migrations.find(m => m.name === 'create_migrations_table')?.sql;
    if (migrationsTableSql) {
      await pool.query(migrationsTableSql);
    }

    // Get executed migrations
    const [executedRows] = await pool.query<
      { name: string }[] & import('mysql2/promise').RowDataPacket[]
    >('SELECT name FROM migrations');
    const executedMigrations = new Set(executedRows.map(row => row.name));

    // Run pending migrations
    for (const migration of migrations) {
      if (migration.name === 'create_migrations_table') continue;

      if (!executedMigrations.has(migration.name)) {
        logger.info(`Running migration: ${migration.name}`);
        await pool.query(migration.sql);
        await pool.query('INSERT INTO migrations (name) VALUES (?)', [migration.name]);
        logger.info(`Migration completed: ${migration.name}`);
      } else {
        logger.info(`Migration already executed: ${migration.name}`);
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run migrations if this file is executed directly
runMigrations().catch(error => {
  logger.error('Migration script failed', error);
  process.exit(1);
});
