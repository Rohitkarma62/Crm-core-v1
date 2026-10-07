import { create } from 'zustand';
import { getDatabase } from '../app/db/dbSetup';

const emptyStats={leads:0,customers:0,sales:0,revenue:0,collection:0,pending:0};

export const useCRMStore=create((set,get)=>({
  stats:emptyStats,recentActivities:[],salesOverview:[],leadPipeline:[],loading:false,error:null,
  leads:[],customers:[],
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
    if(!customerId){
      const result=await db.runAsync('INSERT INTO customers(name,phone,total_paid,pending_amount) VALUES(?,?,0,0)',[lead.name,lead.phone]);
      customerId=result.lastInsertRowId;
    }
    await db.runAsync('UPDATE leads SET stages=?,status=? WHERE id=?',['Won','Won',id]);
    await get().loadLeads(); await get().loadCustomers(); await get().refreshDashboard();
    return customerId;
  },
  loadCustomers:async()=>{
    const db=await getDatabase();
    const rows=await db.getAllAsync(`SELECT c.*,COUNT(s.id) sale_count,COALESCE(SUM(s.amount),0) total_sales
      FROM customers c LEFT JOIN sales s ON s.customer_id=c.id GROUP BY c.id ORDER BY c.id DESC`);
    set({customers:rows||[]}); return rows||[];
  }
}));