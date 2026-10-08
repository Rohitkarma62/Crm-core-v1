import * as SQLite from 'expo-sqlite';

const SCHEMA_VERSION=3;
let databasePromise;

export const getDatabase=()=>{
  if(!databasePromise) databasePromise=SQLite.openDatabaseAsync('welding_workshop_crm.db');
  return databasePromise;
};

async function addColumnIfMissing(db,table,column,definition){
  try{await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)}catch(e){
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
  const versionRow=await db.getFirstAsync('PRAGMA user_version');
  const currentVersion=Number(versionRow?.user_version||0);

  if(currentVersion<1){
    await addColumnIfMissing(db,'sales','work_description',"TEXT NOT NULL DEFAULT ''");
    await addColumnIfMissing(db,'sales','original_amount',"REAL NOT NULL DEFAULT 0");
    await addColumnIfMissing(db,'sales','discount_amount',"REAL NOT NULL DEFAULT 0");
    await db.runAsync("UPDATE sales SET original_amount=amount WHERE original_amount=0 AND discount_amount=0");
  }

  if(currentVersion<2){
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
      CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
      PRAGMA user_version = 2;
    `);
  }

  if(currentVersion<3){
    await db.withExclusiveTransactionAsync(async(txn)=>{
      await txn.execAsync(`
        UPDATE payments
        SET customer_id=(SELECT customer_id FROM sales WHERE sales.id=payments.sale_id)
        WHERE EXISTS(SELECT 1 FROM sales WHERE sales.id=payments.sale_id)
          AND customer_id!=(SELECT customer_id FROM sales WHERE sales.id=payments.sale_id);

        UPDATE sales
        SET paid_amount=COALESCE((SELECT SUM(amount) FROM payments WHERE payments.sale_id=sales.id),0),
            pending_amount=MAX(0,amount-COALESCE((SELECT SUM(amount) FROM payments WHERE payments.sale_id=sales.id),0)),
            status=CASE
              WHEN COALESCE((SELECT SUM(amount) FROM payments WHERE payments.sale_id=sales.id),0)>=amount THEN 'Paid'
              ELSE 'Pending'
            END;

        UPDATE customers
        SET total_paid=COALESCE((SELECT SUM(amount) FROM payments WHERE payments.customer_id=customers.id),0),
            pending_amount=COALESCE((SELECT SUM(pending_amount) FROM sales WHERE sales.customer_id=customers.id),0);

        CREATE TRIGGER IF NOT EXISTS trg_payment_customer_match_insert
        BEFORE INSERT ON payments
        WHEN (SELECT customer_id FROM sales WHERE id=NEW.sale_id) IS NULL
          OR NEW.customer_id!=(SELECT customer_id FROM sales WHERE id=NEW.sale_id)
        BEGIN
          SELECT RAISE(ABORT,'Payment customer does not match the sale');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_payment_customer_match_update
        BEFORE UPDATE OF sale_id,customer_id ON payments
        WHEN (SELECT customer_id FROM sales WHERE id=NEW.sale_id) IS NULL
          OR NEW.customer_id!=(SELECT customer_id FROM sales WHERE id=NEW.sale_id)
        BEGIN
          SELECT RAISE(ABORT,'Payment customer does not match the sale');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_payment_amount_positive_insert
        BEFORE INSERT ON payments
        WHEN NEW.amount<=0
        BEGIN
          SELECT RAISE(ABORT,'Payment amount must be greater than 0');
        END;

        CREATE TRIGGER IF NOT EXISTS trg_payment_amount_positive_update
        BEFORE UPDATE OF amount ON payments
        WHEN NEW.amount<=0
        BEGIN
          SELECT RAISE(ABORT,'Payment amount must be greater than 0');
        END;
      `);
      await txn.runAsync('PRAGMA user_version = 3');
    });
  }

  return db;
}

export async function seedCompanySettings(){
  const db=await getDatabase();
  const row=await db.getFirstAsync('SELECT id FROM company_settings LIMIT 1');
  if(!row) await db.runAsync('INSERT INTO company_settings (name,owner,terms) VALUES (?,?,?)',['','','']);
}
