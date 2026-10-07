import { create } from 'zustand';
import { getDatabase } from '../app/db/dbSetup';

const emptyStats={leads:0,customers:0,sales:0,revenue:0,collection:0,pending:0};

export const useCRMStore=create((set)=>({
  stats:emptyStats,
  recentActivities:[],
  salesOverview:[],
  leadPipeline:[],
  loading:false,
  error:null,
  refreshDashboard:async()=>{
    set({loading:true,error:null});
    try{
      const db=await getDatabase();
      const [counts,recent,salesOverview,pipeline]=await Promise.all([
        db.getFirstAsync(`SELECT
          (SELECT COUNT(*) FROM leads) leads,
          (SELECT COUNT(*) FROM customers) customers,
          (SELECT COUNT(*) FROM sales) sales,
          COALESCE((SELECT SUM(amount) FROM sales),0) revenue,
          COALESCE((SELECT SUM(amount) FROM payments),0) collection,
          COALESCE((SELECT SUM(pending_amount) FROM sales),0) pending`),
        db.getAllAsync(`SELECT 'Payment' type, amount, date FROM payments
          UNION ALL SELECT 'Sale' type, amount, date FROM sales
          ORDER BY date DESC LIMIT 8`),
        db.getAllAsync(`SELECT date, COALESCE(SUM(amount),0) amount
          FROM sales GROUP BY date ORDER BY date DESC LIMIT 7`),
        db.getAllAsync(`SELECT stages stage, COUNT(*) count
          FROM leads GROUP BY stages ORDER BY count DESC`)
      ]);
      set({stats:counts||emptyStats,recentActivities:recent||[],salesOverview:salesOverview||[],leadPipeline:pipeline||[],loading:false});
    }catch(error){set({error:error?.message||'Dashboard load failed',loading:false});}
  }
}));