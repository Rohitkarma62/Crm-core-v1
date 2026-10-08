import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../db/dbSetup';

const BACKUP_VERSION=1;
const TABLES=['company_settings','leads','customers','sales','payments','invoices'];

const mimeFromPath=path=>{
  const ext=String(path||'').split('.').pop()?.toLowerCase();
  return ext==='pdf'?'application/pdf':ext==='jpg'||ext==='jpeg'?'image/jpeg':ext==='png'?'image/png':ext==='webp'?'image/webp':'application/octet-stream';
};

const fileNameFromPath=path=>String(path||'').split('/').pop()||'file';

const readFileAsset=async(path,key)=>{
  if(!path)return null;
  try{
    const info=await FileSystem.getInfoAsync(path);
    if(!info.exists)return null;
    return {
      key,
      originalPath:path,
      name:fileNameFromPath(path),
      mimeType:mimeFromPath(path),
      base64:await FileSystem.readAsStringAsync(path,{encoding:FileSystem.EncodingType.Base64})
    };
  }catch{return null}
};

const addAsset=async(assets,path,key)=>{
  if(!path||assets.some(x=>x.originalPath===path))return;
  const asset=await readFileAsset(path,key);
  if(asset)assets.push(asset);
};

const buildBackup=async()=>{
  const db=await getDatabase();
  const data={};
  for(const table of TABLES)data[table]=await db.getAllAsync('SELECT * FROM '+table);
  const assets=[];
  const company=data.company_settings?.[0];
  await addAsset(assets,company?.logo_uri,'company.logo_uri');
  await addAsset(assets,company?.signature_uri,'company.signature_uri');
  for(const row of data.payments||[])await addAsset(assets,row.screenshot_uri,'payments.'+row.id+'.screenshot_uri');
  for(const row of data.invoices||[]){
    await addAsset(assets,row.pdf_path,'invoices.'+row.id+'.pdf_path');
    await addAsset(assets,row.file_path,'invoices.'+row.id+'.file_path');
  }
  return {
    format:'VF_CRM_BACKUP',
    backup_version:BACKUP_VERSION,
    schema_version:Number((await db.getFirstAsync('PRAGMA user_version'))?.user_version||0),
    created_at:new Date().toISOString(),
    tables:data,
    files:assets
  };
};

const writeBackupFile=async(payload)=>{
  const dir=FileSystem.documentDirectory+'backups/';
  await FileSystem.makeDirectoryAsync(dir,{intermediates:true});
  const uri=dir+'VF_CRM_Backup_'+new Date().toISOString().replace(/[:.]/g,'-')+'.vfbackup';
  await FileSystem.writeAsStringAsync(uri,JSON.stringify(payload),{encoding:FileSystem.EncodingType.UTF8});
  return uri;
};

const saveToDownloads=async(uri)=>{
  const saf=FileSystem.StorageAccessFramework;
  let permission;
  try{
    permission=await saf.requestDirectoryPermissionsAsync(saf.getUriForDirectoryInRoot('Download'));
  }catch{
    permission=await saf.requestDirectoryPermissionsAsync();
  }
  if(!permission.granted)return false;
  const name=fileNameFromPath(uri);
  const target=await saf.createFileAsync(permission.directoryUri,name,'application/octet-stream');
  const base64=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64});
  await FileSystem.writeAsStringAsync(target,base64,{encoding:FileSystem.EncodingType.Base64});
  return true;
};

const restoreAsset=async(asset,index)=>{
  const dir=FileSystem.documentDirectory+'restored/';
  await FileSystem.makeDirectoryAsync(dir,{intermediates:true});
  const safe=String(asset.name||'file').replace(/[^a-zA-Z0-9._-]/g,'_');
  const target=dir+Date.now()+'_'+index+'_'+safe;
  await FileSystem.writeAsStringAsync(target,asset.base64,{encoding:FileSystem.EncodingType.Base64});
  return target;
};

const insertIfMissing=async(txn,sql,args,checkSql,checkArgs)=>{
  const found=await txn.getFirstAsync(checkSql,checkArgs);
  if(found)return found.id;
  const result=await txn.runAsync(sql,args);
  return result.lastInsertRowId;
};

const mergeBackup=async(payload)=>{
  if(!payload||payload.format!=='VF_CRM_BACKUP'||Number(payload.backup_version)!==BACKUP_VERSION)throw new Error('Invalid or unsupported VF backup file.');
  const tables=payload.tables||{};
  const db=await getDatabase();
  const assetMap=new Map();
  for(let i=0;i<(payload.files||[]).length;i++){
    const asset=payload.files[i];
    assetMap.set(asset.originalPath,await restoreAsset(asset,i));
  }
  await db.withExclusiveTransactionAsync(async(txn)=>{
    const customerMap=new Map();
    for(const row of tables.customers||[]){
      const id=await insertIfMissing(txn,
        'INSERT INTO customers(name,phone,total_paid,pending_amount) VALUES(?,?,?,?)',
        [String(row.name||''),String(row.phone||''),Number(row.total_paid||0),Number(row.pending_amount||0)],
        'SELECT id FROM customers WHERE phone=? LIMIT 1',[String(row.phone||'')]);
      customerMap.set(row.id,id);
    }
    for(const row of tables.company_settings||[]){
      const current=await txn.getFirstAsync('SELECT id FROM company_settings LIMIT 1');
      const logo=assetMap.get(row.logo_uri)||null;
      const signature=assetMap.get(row.signature_uri)||null;
      if(!current)await txn.runAsync('INSERT INTO company_settings(name,owner,logo_uri,signature_uri,terms) VALUES(?,?,?,?,?)',
        [row.name||'',row.owner||'',logo,signature,row.terms||'']);
      else if((!current.name&&!current.owner&&!current.terms)&&((row.name||'')||(row.owner||'')||(row.terms||'')))
        await txn.runAsync('UPDATE company_settings SET name=?,owner=?,logo_uri=COALESCE(?,logo_uri),signature_uri=COALESCE(?,signature_uri),terms=? WHERE id=?',
          [row.name||'',row.owner||'',logo,signature,row.terms||'',current.id]);
    }
    for(const row of tables.leads||[]){
      await insertIfMissing(txn,
        'INSERT INTO leads(name,phone,details,source,status,stages,follow_up_date,customer_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
        [row.name||'',row.phone||'',row.details||'',row.source||'',row.status||'New',row.stages||'New',row.follow_up_date||null,customerMap.get(row.customer_id)||null,row.created_at||new Date().toISOString()],
        'SELECT id FROM leads WHERE name=? AND phone=? AND created_at=? LIMIT 1',[row.name||'',row.phone||'',row.created_at||'']);
    }
    const saleMap=new Map();
    for(const row of tables.sales||[]){
      const customerId=customerMap.get(row.customer_id)||row.customer_id;
      const id=await insertIfMissing(txn,
        'INSERT INTO sales(customer_id,amount,work_description,original_amount,discount_amount,date,status,paid_amount,pending_amount) VALUES(?,?,?,?,?,?,?,?,?)',
        [customerId,Number(row.amount||0),row.work_description||'',Number(row.original_amount||row.amount||0),Number(row.discount_amount||0),row.date||new Date().toISOString(),row.status||'Pending',Number(row.paid_amount||0),Number(row.pending_amount||0)],
        'SELECT id FROM sales WHERE customer_id=? AND date=? AND amount=? AND work_description=? LIMIT 1',
        [customerId,row.date||'',Number(row.amount||0),row.work_description||'']);
      saleMap.set(row.id,id);
    }
    for(const row of tables.payments||[]){
      const saleId=saleMap.get(row.sale_id)||row.sale_id;
      const customerId=customerMap.get(row.customer_id)||row.customer_id;
      const screenshot=assetMap.get(row.screenshot_uri)||null;
      await insertIfMissing(txn,
        'INSERT INTO payments(sale_id,customer_id,amount,method,screenshot_uri,date) VALUES(?,?,?,?,?,?)',
        [saleId,customerId,Number(row.amount||0),row.method,screenshot,row.date||new Date().toISOString()],
        'SELECT id FROM payments WHERE sale_id=? AND amount=? AND method=? AND date=? LIMIT 1',
        [saleId,Number(row.amount||0),row.method,row.date||'']);
    }
    for(const row of tables.invoices||[]){
      const saleId=saleMap.get(row.sale_id)||row.sale_id;
      const pdf=assetMap.get(row.pdf_path)||null;
      const image=assetMap.get(row.file_path)||null;
      const existing=await txn.getFirstAsync('SELECT id FROM invoices WHERE invoice_no=?',[row.invoice_no]);
      if(!existing)await txn.runAsync('INSERT INTO invoices(sale_id,invoice_no,pdf_path,file_path,date) VALUES(?,?,?,?,?)',
        [saleId,row.invoice_no,pdf,image,row.date||new Date().toISOString()]);
      else await txn.runAsync('UPDATE invoices SET sale_id=?,pdf_path=COALESCE(?,pdf_path),file_path=COALESCE(?,file_path),date=? WHERE id=?',
        [saleId,pdf,image,row.date||new Date().toISOString(),existing.id]);
    }
    await txn.execAsync("UPDATE sales SET paid_amount=COALESCE((SELECT SUM(amount) FROM payments WHERE payments.sale_id=sales.id),0),pending_amount=MAX(0,amount-COALESCE((SELECT SUM(amount) FROM payments WHERE payments.sale_id=sales.id),0)),status=CASE WHEN COALESCE((SELECT SUM(amount) FROM payments WHERE payments.sale_id=sales.id),0)>=amount THEN 'Paid' ELSE 'Pending' END; UPDATE customers SET total_paid=COALESCE((SELECT SUM(amount) FROM payments WHERE payments.customer_id=customers.id),0),pending_amount=COALESCE((SELECT SUM(pending_amount) FROM sales WHERE sales.customer_id=customers.id),0);");
  });
};

export const exportCRMBackup=async()=>{
  const payload=await buildBackup();
  const uri=await writeBackupFile(payload);
  const saved=await saveToDownloads(uri);
  return {saved,uri,counts:Object.fromEntries(TABLES.map(table=>[table,payload.tables[table]?.length||0]))};
};

export const importCRMBackup=async()=>{
  const result=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true});
  if(result.canceled)return {canceled:true};
  const uri=result.assets?.[0]?.uri;
  if(!uri)throw new Error('Backup file could not be read.');
  const raw=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.UTF8});
  await mergeBackup(JSON.parse(raw));
  return {canceled:false};
};
