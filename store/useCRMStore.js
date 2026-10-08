import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../app/db/dbSetup';
import { LEAD_STAGES,PAYMENT_METHODS } from '../app/core/constants';
import { normalizeDate,normalizeError,nonNegativeMoney,positiveMoney,requiredText,validatePhone } from '../app/core/validation';

const emptyStats={leads:0,customers:0,sales:0,revenue:0,collection:0,pending:0};

const normalizeStats=(row)=>({
  leads:Number(row?.leads||0),
  customers:Number(row?.customers||0),
  sales:Number(row?.sales||0),
  revenue:Number(row?.revenue||0),
  collection:Number(row?.collection||0),
  pending:Number(row?.pending||0)
});

const runAction=async(action,fallback)=>{
  try{return await action();}
  catch(error){throw new Error(normalizeError(error,fallback));}
};

const refreshAfterMutation=async(...actions)=>{
  await Promise.all(actions.map(action=>Promise.resolve().then(action).catch(()=>{})));
};
const deleteLocalFiles=async(paths)=>{
  await Promise.all((paths||[]).filter(Boolean).map(async path=>{
    try{await FileSystem.deleteAsync(path,{idempotent:true})}catch{}
  }));
};

export const useCRMStore=create((set,get)=>({
  stats:emptyStats,recentActivities:[],salesOverview:[],leadPipeline:[],loading:false,error:null,
  leads:[],customers:[],sales:[],payments:[],reportSummary:{},reportMethods:[],reportMonthly:[],companySettings:{},
  refreshDashboard:async()=>{
    set({loading:true,error:null});
    try{
      const db=await getDatabase();
      const [counts,recent,salesOverview,pipeline]=await Promise.all([
        db.getFirstAsync(`SELECT (SELECT COUNT(*) FROM leads WHERE status!='Converted') leads,(SELECT COUNT(*) FROM customers) customers,(SELECT COUNT(*) FROM sales) sales,COALESCE((SELECT SUM(amount) FROM sales),0) revenue,COALESCE((SELECT SUM(amount) FROM payments),0) collection,COALESCE((SELECT SUM(pending_amount) FROM sales),0) pending`),
        db.getAllAsync(`SELECT 'Payment' type,amount,date FROM payments UNION ALL SELECT 'Sale' type,amount,date FROM sales ORDER BY date DESC LIMIT 8`),
        db.getAllAsync(`SELECT date,COALESCE(SUM(amount),0) amount FROM sales GROUP BY date ORDER BY date DESC LIMIT 7`),
        db.getAllAsync(`SELECT stages stage,COUNT(*) count FROM leads WHERE status!='Converted' GROUP BY stages ORDER BY count DESC`)
      ]);
      set({stats:normalizeStats(counts),recentActivities:recent||[],salesOverview:salesOverview||[],leadPipeline:pipeline||[],loading:false});
    }catch(error){set({error:error?.message||'Dashboard load failed',loading:false});}
  },
  loadLeads:async()=>{
    const db=await getDatabase();
    const rows=await db.getAllAsync("SELECT * FROM leads WHERE status!='Converted' ORDER BY id DESC");
    set({leads:rows||[]}); return rows||[];
  },
  saveLead:async(lead)=>runAction(async()=>{
    const db=await getDatabase();
    const name=requiredText(lead.name,'Lead name');
    const phone=validatePhone(lead.phone);
    const stage=LEAD_STAGES.includes(lead.stages)?lead.stages:'New';
    const followUp=lead.follow_up_date?normalizeDate(lead.follow_up_date):null;
    if(lead.id){
      const result=await db.runAsync('UPDATE leads SET name=?,phone=?,details=?,source=?,status=?,stages=?,follow_up_date=? WHERE id=?',
        [name,phone,String(lead.details||'').trim(),String(lead.source||'').trim(),stage,stage,followUp,lead.id]);
      if(!result.changes) throw new Error('Lead not found');
    }else{
      await db.runAsync('INSERT INTO leads(name,phone,details,source,status,stages,follow_up_date) VALUES(?,?,?,?,?,?,?)',
        [name,phone,String(lead.details||'').trim(),String(lead.source||'').trim(),stage,stage,followUp]);
    }
    await refreshAfterMutation(()=>get().loadLeads(),()=>get().refreshDashboard());
  },'Lead save failed'),
  deleteLead:async(id)=>runAction(async()=>{
    if(!id) throw new Error('Lead not found');
    const db=await getDatabase();
    const result=await db.runAsync('DELETE FROM leads WHERE id=?',[id]);
    if(!result.changes) throw new Error('Lead not found');
    await refreshAfterMutation(()=>get().loadLeads(),()=>get().refreshDashboard());
  },'Lead deletion failed'),
  moveLead:async(id,stage)=>runAction(async()=>{
    if(!id||!LEAD_STAGES.includes(stage)) throw new Error('Invalid lead stage');
    const db=await getDatabase();
    const result=await db.runAsync('UPDATE leads SET stages=?,status=? WHERE id=?',[stage,stage,id]);
    if(!result.changes) throw new Error('Lead not found');
    await refreshAfterMutation(()=>get().loadLeads(),()=>get().refreshDashboard());
  },'Lead stage update failed'),
  convertLead:async(id)=>{
    if(!id) throw new Error('Lead not found');
    const db=await getDatabase();
    let customerId;
    await db.withExclusiveTransactionAsync(async(txn)=>{
      const lead=await txn.getFirstAsync('SELECT * FROM leads WHERE id=?',[id]);
      if(!lead) throw new Error('Lead not found');
      const existingCustomer=await txn.getFirstAsync('SELECT id FROM customers WHERE phone=?',[lead.phone]);
      if(existingCustomer){
        customerId=existingCustomer.id;
      }else{
        const result=await txn.runAsync('INSERT INTO customers(name,phone,total_paid,pending_amount) VALUES(?,?,0,0)',[lead.name,lead.phone]);
        customerId=result.lastInsertRowId;
      }
      const result=await txn.runAsync('UPDATE leads SET stages=?,status=?,customer_id=? WHERE id=?',['Converted','Converted',customerId,id]);
      if(!result.changes) throw new Error('Lead could not be converted');
    });
    await refreshAfterMutation(()=>get().loadLeads(),()=>get().loadCustomers(),()=>get().refreshDashboard());
    return customerId;
  },
  loadCustomers:async()=>{
    const db=await getDatabase();
    const rows=await db.getAllAsync(`SELECT c.id,c.name,c.phone,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.customer_id=c.id),0) total_paid,
      COALESCE((SELECT SUM(s.pending_amount) FROM sales s WHERE s.customer_id=c.id),0) pending_amount,
      COUNT(s.id) sale_count,
      COALESCE(SUM(s.amount),0) total_sales,
      COALESCE(SUM(s.discount_amount),0) total_discount,
      MAX(s.date) last_job_date
      FROM customers c LEFT JOIN sales s ON s.customer_id=c.id
      GROUP BY c.id,c.name,c.phone ORDER BY c.id DESC`);
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
  createSale:async({customerId,amount,date,workDescription,discountAmount})=>runAction(async()=>{
    const value=positiveMoney(amount,'Work amount');
    const discount=nonNegativeMoney(discountAmount||0,'Discount');
    if(!customerId) throw new Error('Customer is required');
    if(discount>=value) throw new Error('Discount must be less than the work amount');
    const db=await getDatabase();
    const customer=await db.getFirstAsync('SELECT id FROM customers WHERE id=?',[customerId]);
    if(!customer) throw new Error('Customer not found');
    const finalAmount=Math.round((value-discount)*100)/100;
    const normalizedDate=normalizeDate(date);
    let saleId;
    await db.withExclusiveTransactionAsync(async(txn)=>{
      const result=await txn.runAsync('INSERT INTO sales(customer_id,amount,date,status,paid_amount,pending_amount,work_description,original_amount,discount_amount) VALUES(?,?,?,?,?,?,?,?,?)',
        [customerId,finalAmount,normalizedDate,'Pending',0,finalAmount,String(workDescription||'').trim(),value,discount]);
      saleId=result.lastInsertRowId;
      await txn.runAsync('UPDATE customers SET total_paid=COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=?),0),pending_amount=COALESCE((SELECT SUM(pending_amount) FROM sales WHERE customer_id=?),0) WHERE id=?',
        [customerId,customerId,customerId]);
    });
    await refreshAfterMutation(()=>get().loadSales(),()=>get().loadCustomers(),()=>get().refreshDashboard());
    return saleId;
  },'Sale creation failed'),
  addPayment:async({saleId,customerId,amount,method,screenshotUri})=>runAction(async()=>{
    const value=positiveMoney(amount,'Payment amount');
    if(!PAYMENT_METHODS.includes(method)) throw new Error('Invalid payment method');
    if(!saleId||!customerId) throw new Error('Sale and customer are required');
    const db=await getDatabase();
    await db.withExclusiveTransactionAsync(async(txn)=>{
      const sale=await txn.getFirstAsync('SELECT id,customer_id,amount FROM sales WHERE id=?',[saleId]);
      if(!sale) throw new Error('Sale not found');
      if(Number(sale.customer_id)!==Number(customerId)) throw new Error('Payment customer does not match the sale');
      const paidRow=await txn.getFirstAsync('SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE sale_id=?',[saleId]);
      const paidBefore=Number(paidRow?.paid||0);
      const remaining=Math.max(0,Number(sale.amount)-paidBefore);
      if(value>remaining+0.0001) throw new Error('Payment cannot exceed pending amount');
      await txn.runAsync('INSERT INTO payments(sale_id,customer_id,amount,method,screenshot_uri,date) VALUES(?,?,?,?,?,?)',
        [saleId,customerId,value,method,screenshotUri||null,new Date().toISOString()]);
      const paidAfter=paidBefore+value;
      const pending=Math.max(0,Number(sale.amount)-paidAfter);
      await txn.runAsync('UPDATE sales SET paid_amount=?,pending_amount=?,status=? WHERE id=?',
        [paidAfter,pending,pending<=0.0001?'Paid':'Pending',saleId]);
      await txn.runAsync('UPDATE customers SET total_paid=COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=?),0),pending_amount=COALESCE((SELECT SUM(pending_amount) FROM sales WHERE customer_id=?),0) WHERE id=?',
        [customerId,customerId,customerId]);
    });
    await refreshAfterMutation(()=>get().loadSales(),()=>get().loadCustomers(),()=>get().refreshDashboard(),()=>get().loadPayments(saleId));
  },'Payment could not be saved'),
  saveInvoice:async({saleId,invoiceNo,pdfPath,filePath,date})=>runAction(async()=>{
    if(!saleId||!invoiceNo) throw new Error('Sale and invoice number are required');
    const db=await getDatabase();
    const sale=await db.getFirstAsync('SELECT id FROM sales WHERE id=?',[saleId]);
    if(!sale) throw new Error('Sale not found');
    await db.runAsync(`INSERT INTO invoices(sale_id,invoice_no,pdf_path,file_path,date)
      VALUES(?,?,?,?,?)
      ON CONFLICT(invoice_no) DO UPDATE SET sale_id=excluded.sale_id,pdf_path=COALESCE(excluded.pdf_path,invoices.pdf_path),file_path=COALESCE(excluded.file_path,invoices.file_path),date=excluded.date`,
      [saleId,invoiceNo,pdfPath||null,filePath||null,normalizeDate(date)]);
  },'Invoice could not be saved'),
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
  loadCustomerProfile:async(customerId)=>{
    if(!customerId) throw new Error('Customer not found');
    const db=await getDatabase();
    const [customer,sales,payments,invoices]=await Promise.all([
      db.getFirstAsync('SELECT * FROM customers WHERE id=?',[customerId]),
      db.getAllAsync('SELECT * FROM sales WHERE customer_id=? ORDER BY date DESC,id DESC',[customerId]),
      db.getAllAsync('SELECT * FROM payments WHERE customer_id=? ORDER BY date DESC,id DESC',[customerId]),
      db.getAllAsync('SELECT i.* FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE s.customer_id=? ORDER BY i.date DESC,i.id DESC',[customerId])
    ]);
    if(!customer) throw new Error('Customer not found');
    const list=sales||[],totalJobs=list.length,totalSpent=list.reduce((a,x)=>a+Number(x.amount||0),0),totalPaid=list.reduce((a,x)=>a+Number(x.paid_amount||0),0),totalPending=list.reduce((a,x)=>a+Number(x.pending_amount||0),0),totalDiscount=list.reduce((a,x)=>a+Number(x.discount_amount||0),0);
    return {customer,sales:list,payments:payments||[],invoices:invoices||[],stats:{totalJobs,totalSpent,totalPaid,totalPending,totalDiscount,averageJob:totalJobs?totalSpent/totalJobs:0,discountRate:(totalSpent+totalDiscount)>0?(totalDiscount/(totalSpent+totalDiscount))*100:0,lastJobDate:list[0]?.date||null}};
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
  deleteCustomer:async(id)=>runAction(async()=>{
    if(!id) throw new Error('Customer not found');
    const db=await getDatabase();
    const files=await db.getAllAsync(
      'SELECT screenshot_uri path FROM payments WHERE customer_id=? AND screenshot_uri IS NOT NULL UNION ALL SELECT i.pdf_path path FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE s.customer_id=? AND i.pdf_path IS NOT NULL UNION ALL SELECT i.file_path path FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE s.customer_id=? AND i.file_path IS NOT NULL',
      [id,id,id]
    );
    const result=await db.runAsync('DELETE FROM customers WHERE id=?',[id]);
    if(!result.changes) throw new Error('Customer not found');
    await deleteLocalFiles(files?.map(x=>x.path));
    await refreshAfterMutation(()=>get().loadCustomers(),()=>get().loadSales(),()=>get().refreshDashboard());
  },'Customer deletion failed'),
  deleteSale:async(id)=>runAction(async()=>{
    if(!id) throw new Error('Sale not found');
    const db=await getDatabase();
    const files=await db.getAllAsync(
      'SELECT screenshot_uri path FROM payments WHERE sale_id=? AND screenshot_uri IS NOT NULL UNION ALL SELECT pdf_path path FROM invoices WHERE sale_id=? AND pdf_path IS NOT NULL UNION ALL SELECT file_path path FROM invoices WHERE sale_id=? AND file_path IS NOT NULL',
      [id,id,id]
    );
    const result=await db.runAsync('DELETE FROM sales WHERE id=?',[id]);
    if(!result.changes) throw new Error('Sale not found');
    await deleteLocalFiles(files?.map(x=>x.path));
    await refreshAfterMutation(()=>get().loadSales(),()=>get().loadCustomers(),()=>get().refreshDashboard());
  },'Sale deletion failed'),
  deletePayment:async(id)=>runAction(async()=>{
    if(!id) throw new Error('Payment not found');
    const db=await getDatabase();
    const payment=await db.getFirstAsync('SELECT sale_id,customer_id,screenshot_uri FROM payments WHERE id=?',[id]);
    if(!payment) throw new Error('Payment not found');
    await db.withExclusiveTransactionAsync(async(txn)=>{
      const result=await txn.runAsync('DELETE FROM payments WHERE id=?',[id]);
      if(!result.changes) throw new Error('Payment not found');
      const sale=await txn.getFirstAsync('SELECT amount FROM sales WHERE id=?',[payment.sale_id]);
      if(sale){
        const paidRow=await txn.getFirstAsync('SELECT COALESCE(SUM(amount),0) paid FROM payments WHERE sale_id=?',[payment.sale_id]);
        const paid=Number(paidRow?.paid||0), pending=Math.max(0,Number(sale.amount)-paid);
        await txn.runAsync('UPDATE sales SET paid_amount=?,pending_amount=?,status=? WHERE id=?',[paid,pending,pending<=0.0001?'Paid':'Pending',payment.sale_id]);
      }
      await txn.runAsync('UPDATE customers SET total_paid=COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=?),0),pending_amount=COALESCE((SELECT SUM(pending_amount) FROM sales WHERE customer_id=?),0) WHERE id=?',[payment.customer_id,payment.customer_id,payment.customer_id]);
    });
    await deleteLocalFiles([payment.screenshot_uri]);
    await refreshAfterMutation(()=>get().loadSales(),()=>get().loadCustomers(),()=>get().refreshDashboard());
  },'Payment deletion failed'),
  loadCompanySettings:async()=>{
    const db=await getDatabase();
    const row=await db.getFirstAsync('SELECT * FROM company_settings LIMIT 1');
    set({companySettings:row||{}}); return row;
  },
  saveCompanySettings:async(data)=>{
    const db=await getDatabase();
    const row=await db.getFirstAsync('SELECT * FROM company_settings LIMIT 1');
    const nextLogo=data.logo_uri||null;
    const nextSignature=data.signature_uri||null;
    const name=String(data.name||'');
    const owner=String(data.owner||'');
    const terms=String(data.terms||'');
    let saved;
    if(row){
      const result=await db.runAsync('UPDATE company_settings SET name=?,owner=?,logo_uri=?,signature_uri=?,terms=? WHERE id=?',[name,owner,nextLogo,nextSignature,terms,row.id]);
      if(!result.changes) throw new Error('Company settings could not be saved');
      saved={...row,name,owner,logo_uri:nextLogo,signature_uri:nextSignature,terms};
      await deleteLocalFiles([
        row.logo_uri&&row.logo_uri!==nextLogo?row.logo_uri:null,
        row.signature_uri&&row.signature_uri!==nextSignature?row.signature_uri:null
      ]);
    }else{
      const result=await db.runAsync('INSERT INTO company_settings(name,owner,logo_uri,signature_uri,terms) VALUES(?,?,?,?,?)',[name,owner,nextLogo,nextSignature,terms]);
      saved={id:result.lastInsertRowId,name,owner,logo_uri:nextLogo,signature_uri:nextSignature,terms};
    }
    set({companySettings:saved});
    return saved;
  }
}));