import { create } from 'zustand';
import { getDatabase } from '../app/db/dbSetup';

const emptyStats={leads:0,customers:0,sales:0,revenue:0,collection:0,pending:0};

export const useCRMStore=create((set,get)=>({
  stats:emptyStats,recentActivities:[],salesOverview:[],leadPipeline:[],loading:false,error:null,
  leads:[],customers:[],sales:[],payments:[],reportSummary:{},reportMethods:[],reportMonthly:[],companySettings:{},
  refreshDashboard:async()=>{
    set({loading:true,error:null});
    try{
      const db=await getDatabase();
      const [counts,recent,salesOverview,pipeline]=await Promise.all([
        db.getFirstAsync(`SELECT (SELECT COUNT(*) FROM leads) leads,(SELECT COUNT(*) FROM customers) customers,(SELECT COUNT(*) FROM sales) sales,COALESCE((SELECT SUM(amount) FROM sales),0) revenue,COALESCE((SELECT SUM(amount) FROM payments),0) collection,COALESCE((SELECT SUM(pending_amount) FROM sales),0) pending`),
        db.getAllAsync(`SELECT 'Payment' type,amount,date FROM payments UNION ALL SELECT 'Sale' type,amount,date FROM sales ORDER BY date DESC LIMIT 8`),
        db.getAllAsync(`SELECT date,COALESCE(SUM(amount),0) amount FROM sales GROUP BY date ORDER BY date DESC LIMIT 7`),
        db.getAllAsync(`SELECT stages stage,COUNT(*) count FROM leads GROUP BY stages ORDER BY count DESC`)
      ]);
      set({stats:counts||emptyStats,recentActivities:recent||[],salesOverview:salesOverview||[],leadPipeline:pipeline||[],loading:false});
    }catch(error){set({error:error?.message||'Dashboard load failed',loading:false});}
  },
  loadLeads:async()=>{
    const db=await getDatabase();
    const rows=await db.getAllAsync('SELECT * FROM leads ORDER BY id DESC');
    set({leads:rows||[]}); return rows||[];
  },
  saveLead:async(lead)=>{
    const db=await getDatabase();
    if(lead.id){
      await db.runAsync('UPDATE leads SET name=?,phone=?,details=?,source=?,status=?,stages=?,follow_up_date=? WHERE id=?',
        [lead.name.trim(),lead.phone.trim(),lead.details||'',lead.source||'',lead.status||'New',lead.stages||'New',lead.follow_up_date||null,lead.id]);
    }else{
      await db.runAsync('INSERT INTO leads(name,phone,details,source,status,stages,follow_up_date) VALUES(?,?,?,?,?,?,?)',
        [lead.name.trim(),lead.phone.trim(),lead.details||'',lead.source||'',lead.status||'New',lead.stages||'New',lead.follow_up_date||null]);
    }
    await get().loadLeads(); await get().refreshDashboard();
  },
  deleteLead:async(id)=>{
    const db=await getDatabase(); await db.runAsync('DELETE FROM leads WHERE id=?',[id]); await get().loadLeads(); await get().refreshDashboard();
  },
  moveLead:async(id,stage)=>{
    const db=await getDatabase(); await db.runAsync('UPDATE leads SET stages=?,status=? WHERE id=?',[stage,stage,id]); await get().loadLeads(); await get().refreshDashboard();
  },
  convertLead:async(id)=>{
    const db=await getDatabase();
    const lead=await db.getFirstAsync('SELECT * FROM leads WHERE id=?',[id]);
    if(!lead) throw new Error('Lead not found');
    const existing=await db.getFirstAsync('SELECT id FROM customers WHERE phone=?',[lead.phone]);
    let customerId=existing?.id;
    await db.withExclusiveTransactionAsync(async(txn)=>{
      const existingCustomer=await txn.getFirstAsync('SELECT id FROM customers WHERE phone=?',[lead.phone]);
      if(existingCustomer){
        customerId=existingCustomer.id;
      }else{
        const result=await txn.runAsync('INSERT INTO customers(name,phone,total_paid,pending_amount) VALUES(?,?,0,0)',[lead.name,lead.phone]);
        customerId=result.lastInsertRowId;
      }
      await txn.runAsync('UPDATE leads SET stages=?,status=? WHERE id=?',['Won','Won',id]);
    });
    await get().loadLeads(); await get().loadCustomers(); await get().refreshDashboard();
    return customerId;
  },
  loadCustomers:async()=>{
    const db=await getDatabase();
    const rows=await db.getAllAsync(`SELECT c.*,COUNT(s.id) sale_count,COALESCE(SUM(s.amount),0) total_sales
      FROM customers c LEFT JOIN sales s ON s.customer_id=c.id GROUP BY c.id ORDER BY c.id DESC`);
    set({customers:rows||[]}); return rows||[];
  },
  loadSales:async()=>{
    const db=await getDatabase();
    const rows=await db.getAllAsync(`SELECT s.*,c.name customer_name,c.phone FROM sales s JOIN customers c ON c.id=s.customer_id ORDER BY s.date DESC,s.id DESC`);
    set({sales:rows||[]}); return rows||[];
  },
  loadPayments:async(saleId)=>{
    const db=await getDatabase();
    const rows=await db.getAllAsync(`SELECT p.*,c.name customer_name FROM payments p JOIN customers c ON c.id=p.customer_id WHERE p.sale_id=? ORDER BY p.date DESC,p.id DESC`,[saleId]);
    set({payments:rows||[]}); return rows||[];
  },
  createSale:async({customerId,amount,date})=>{
    const value=Number(amount);
    if(!customerId||!Number.isFinite(value)||value<=0) throw new Error('Valid customer and sale amount required');
    const db=await getDatabase();
    const result=await db.runAsync('INSERT INTO sales(customer_id,amount,date,status,paid_amount,pending_amount) VALUES(?,?,?,?,?,?)',[customerId,value,date||new Date().toISOString(),'Pending',0,value]);
    await get().loadSales(); await get().loadCustomers(); await get().refreshDashboard();
    return result.lastInsertRowId;
  },
  addPayment:async({saleId,customerId,amount,method,screenshotUri})=>{
    const value=Number(amount);
    if(!['Cash','UPI','Card','Cheque'].includes(method)) throw new Error('Invalid payment method');
    if(!saleId||!customerId||!Number.isFinite(value)||value<=0) throw new Error('Valid payment required');
    const db=await getDatabase();
    const sale=await db.getFirstAsync('SELECT amount,paid_amount FROM sales WHERE id=?',[saleId]);
    if(!sale) throw new Error('Sale not found');
    const remaining=Number(sale.amount)-Number(sale.paid_amount||0);
    if(value>remaining+0.0001) throw new Error('Payment pending amount se zyada nahi ho sakta');
    await db.withTransactionAsync(async()=>{
      await db.runAsync('INSERT INTO payments(sale_id,customer_id,amount,method,screenshot_uri,date) VALUES(?,?,?,?,?,?)',[saleId,customerId,value,method,screenshotUri||null,new Date().toISOString()]);
    const paid=Number(sale.paid_amount||0)+value;
    const pending=Math.max(0,Number(sale.amount)-paid);
    const status=pending<=0.0001?'Paid':'Pending';
    await db.runAsync('UPDATE sales SET paid_amount=?,pending_amount=?,status=? WHERE id=?',[paid,pending,status,saleId]);
      await db.runAsync('UPDATE customers SET total_paid=COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=?),0),pending_amount=COALESCE((SELECT SUM(pending_amount) FROM sales WHERE customer_id=?),0) WHERE id=?',[customerId,customerId,customerId]);
    });
    await get().loadSales(); await get().loadCustomers(); await get().refreshDashboard(); await get().loadPayments(saleId);
  },
  saveInvoice:async({saleId,invoiceNo,pdfPath,date})=>{
    if(!saleId||!invoiceNo) throw new Error('Sale and invoice number are required');
    const db=await getDatabase();
    await db.runAsync('INSERT OR REPLACE INTO invoices(sale_id,invoice_no,pdf_path,date) VALUES(?,?,?,?)',[saleId,invoiceNo,pdfPath||null,date||new Date().toISOString()]);
  },
  loadReports:async()=>{
    const db=await getDatabase();
    const [summary,methods,monthly]=await Promise.all([
      db.getFirstAsync(`SELECT COUNT(*) sales_count,COALESCE(SUM(amount),0) revenue,COALESCE(SUM(paid_amount),0) collection,COALESCE(SUM(pending_amount),0) pending FROM sales`),
      db.getAllAsync(`SELECT method,COUNT(*) count,COALESCE(SUM(amount),0) amount FROM payments GROUP BY method ORDER BY amount DESC`),
      db.getAllAsync(`SELECT substr(date,1,7) month,COUNT(*) sales_count,COALESCE(SUM(amount),0) revenue,COALESCE(SUM(paid_amount),0) collection,COALESCE(SUM(pending_amount),0) pending FROM sales GROUP BY substr(date,1,7) ORDER BY month DESC LIMIT 12`)
    ]);
    const normalized={sales_count:Number(summary?.sales_count||0),revenue:Number(summary?.revenue||0),collection:Number(summary?.collection||0),pending:Number(summary?.pending||0)};
    set({reportSummary:normalized,reportMethods:methods||[],reportMonthly:monthly||[]});
    return {summary:normalized,methods:methods||[],monthly:monthly||[]};
  },
  loadCustomerHistory:async(customerId)=>{
    if(!customerId) throw new Error('Customer not found');
    const db=await getDatabase();
    const [sales,payments,invoices]=await Promise.all([
      db.getAllAsync('SELECT * FROM sales WHERE customer_id=? ORDER BY date DESC,id DESC',[customerId]),
      db.getAllAsync('SELECT * FROM payments WHERE customer_id=? ORDER BY date DESC,id DESC',[customerId]),
      db.getAllAsync('SELECT i.* FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE s.customer_id=? ORDER BY i.date DESC,i.id DESC',[customerId])
    ]);
    return {sales:sales||[],payments:payments||[],invoices:invoices||[]};
  },
  deleteCustomer:async(id)=>{
    if(!id) throw new Error('Customer not found');
    const db=await getDatabase();
    await db.runAsync('DELETE FROM customers WHERE id=?',[id]);
    await get().loadCustomers(); await get().loadSales(); await get().refreshDashboard();
  },
  deleteSale:async(id)=>{
    if(!id) throw new Error('Sale not found');
    const db=await getDatabase();
    await db.runAsync('DELETE FROM sales WHERE id=?',[id]);
    await get().loadSales(); await get().loadCustomers(); await get().refreshDashboard();
  },
  deletePayment:async(id)=>{
    if(!id) throw new Error('Payment not found');
    const db=await getDatabase();
    const payment=await db.getFirstAsync('SELECT sale_id,customer_id FROM payments WHERE id=?',[id]);
    if(!payment) throw new Error('Payment not found');
    await db.withTransactionAsync(async()=>{
      await db.runAsync('DELETE FROM payments WHERE id=?',[id]);
      const sale=await db.getFirstAsync('SELECT amount FROM sales WHERE id=?',[payment.sale_id]);
      if(sale){
        const paidRow=await db.getFirstAsync('SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE sale_id=?',[payment.sale_id]);
        const paid=Number(paidRow?.paid||0), pending=Math.max(0,Number(sale.amount)-paid);
        await db.runAsync('UPDATE sales SET paid_amount=?,pending_amount=?,status=? WHERE id=?',[paid,pending,pending<=0.0001?'Paid':'Pending',payment.sale_id]);
      }
      await db.runAsync('UPDATE customers SET total_paid=COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=?),0),pending_amount=COALESCE((SELECT SUM(pending_amount) FROM sales WHERE customer_id=?),0) WHERE id=?',[payment.customer_id,payment.customer_id,payment.customer_id]);
    });
    await get().loadSales(); await get().loadCustomers(); await get().refreshDashboard();
  },
  loadCompanySettings:async()=>{
    const db=await getDatabase();
    const row=await db.getFirstAsync('SELECT * FROM company_settings LIMIT 1');
    set({companySettings:row||{}}); return row;
  },
  saveCompanySettings:async(data)=>{
    const db=await getDatabase();
    const row=await db.getFirstAsync('SELECT id FROM company_settings LIMIT 1');
    if(row) await db.runAsync('UPDATE company_settings SET name=?,owner=?,logo_uri=?,signature_uri=?,terms=? WHERE id=?',[data.name||'',data.owner||'',data.logo_uri||null,data.signature_uri||null,data.terms||'',row.id]);
    else await db.runAsync('INSERT INTO company_settings(name,owner,logo_uri,signature_uri,terms) VALUES(?,?,?,?,?)',[data.name||'',data.owner||'',data.logo_uri||null,data.signature_uri||null,data.terms||'']);
    return get().loadCompanySettings();
  }
}));