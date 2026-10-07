import * as SQLite from 'expo-sqlite';

let databasePromise;

export const getDatabase=()=>{
  if(!databasePromise) databasePromise=SQLite.openDatabaseAsync('welding_workshop_crm.db');
  return databasePromise;
};

async function addColumnIfMissing(db,table,column,definition){
  try{await db.execAsync(\`ALTER TABLE \${table} ADD COLUMN \${column} \${definition}\`)}catch(e){
    const message=String(e?.message||e);
    if(!/duplicate column|already exists/i.test(message)) throw e;
  }
}

export async function initDatabase(){
  const db=await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      owner TEXT NOT NULL DEFAULT '',
      logo_uri TEXT,
      signature_uri TEXT,
      terms TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New',
      stages TEXT NOT NULL DEFAULT 'New',
      follow_up_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      total_paid REAL NOT NULL DEFAULT 0,
      pending_amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      paid_amount REAL NOT NULL DEFAULT 0,
      pending_amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      method TEXT NOT NULL CHECK(method IN ('Cash','UPI','Card','Cheque')),
      screenshot_uri TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      invoice_no TEXT NOT NULL UNIQUE,
      pdf_path TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
    CREATE INDEX IF NOT EXISTS idx_leads_status_stage ON leads(status, stages);
    CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_date);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
    CREATE INDEX IF NOT EXISTS idx_invoices_sale ON invoices(sale_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
  `);
  await addColumnIfMissing(db,'sales','work_description',"TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db,'sales','original_amount',"REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing(db,'sales','discount_amount',"REAL NOT NULL DEFAULT 0");
  await db.runAsync("UPDATE sales SET original_amount=amount WHERE original_amount=0 AND discount_amount=0");
  return db;
}

export async function seedCompanySettings(){
  const db=await getDatabase();
  const row=await db.getFirstAsync('SELECT id FROM company_settings LIMIT 1');
  if(!row) await db.runAsync('INSERT INTO company_settings (name,owner,terms) VALUES (?,?,?)',['','','']);
}
