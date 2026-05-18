const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Database
const dbPath = path.resolve(__dirname, 'food-delivery.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
  );
`);

// Seed data
const count = db.prepare('SELECT count(*) as count FROM menu_items').get();
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO menu_items (name, description, price, image_url) VALUES (?, ?, ?, ?)');
  insert.run('Classic Cheeseburger', 'Juicy beef patty with melted cheese.', 8.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800');
  insert.run('Margherita Pizza', 'Traditional Italian pizza with fresh mozzarella.', 12.50, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80');
  insert.run('Spicy Tuna Roll', 'Fresh tuna rolled with spicy mayo.', 10.00, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800');
}

// Middleware
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/menu', (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items').all();
  res.json(items);
});

app.post('/api/orders', (req, res) => {
  const { customer_name, items } = req.body;
  if (!customer_name || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order' });
  }

  const insertOrder = db.transaction((orderData) => {
    let total = 0;
    const orderResult = db.prepare('INSERT INTO orders (customer_name, total_price) VALUES (?, 0)').run(orderData.customer_name);
    const orderId = orderResult.lastInsertRowid;
    
    const insertItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)');
    const getPrice = db.prepare('SELECT price FROM menu_items WHERE id = ?');
    
    for (const item of orderData.items) {
      const menuItem = getPrice.get(item.id);
      if (menuItem) {
        total += menuItem.price * item.quantity;
        insertItem.run(orderId, item.id, item.quantity);
      }
    }
    
    db.prepare('UPDATE orders SET total_price = ? WHERE id = ?').run(total, orderId);
    return { orderId, total };
  });

  try {
    const result = insertOrder({ customer_name, items });
    res.json({ success: true, order_id: result.orderId, total: result.total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
