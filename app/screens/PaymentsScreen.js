import React,{useEffect,useRef,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Alert,Image,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {PAYMENT_METHODS} from '../../app/core/constants';
import {escapeHtml} from '../../app/core/validation';
import {useCRMStore} from '../../store/useCRMStore';
import {captureRef} from 'react-native-view-shot';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import {saveFileToDevice} from '../../app/core/fileStorage';
import Share from 'react-native-share';

const METHODS=PAYMENT_METHODS;

const imageMimeFromUri=(uri)=>{const ext=String(uri||'').split('?')[0].split('.').pop()?.toLowerCase();if(ext==='png')return'image/png';if(ext==='webp')return'image/webp';if(ext==='heic')return'image/heic';return'image/jpeg'};
const toDataUri=async(uri)=>{if(!uri)return'';const base64=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64});return`data:${imageMimeFromUri(uri)};base64,${base64}`};

export default function PaymentsScreen({route}){
 const saleId=route.params?.saleId;
 const {sales,loadSales,payments,loadPayments,addPayment,saveInvoice,companySettings,loadCompanySettings}=useCRMStore();
 const sale=sales.find(x=>Number(x.id)===Number(saleId));
 const [amount,setAmount]=useState(''),[method,setMethod]=useState('Cash'),[screenshot,setScreenshot]=useState(null),[busy,setBusy]=useState(false),[invoiceData,setInvoiceData]=useState(null);
 const pendingScreenshot=useRef(null);
 const invoiceViewRef=useRef(null);
 useEffect(()=>()=>{const path=pendingScreenshot.current;if(path)FileSystem.deleteAsync(path,{idempotent:true}).catch(()=>{})},[]);

 useFocusEffect(React.useCallback(()=>{loadSales().catch(()=>{});loadCompanySettings().catch(()=>{});if(saleId)loadPayments(saleId).catch(()=>{})},[saleId,loadSales,loadCompanySettings,loadPayments]));

 const pickScreenshot=async()=>{
   try{
     const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
     if(!permission.granted){Alert.alert('Permission required','Gallery permission is required for the UPI/payment screenshot.');return}
     const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.8});
     if(result.canceled)return;
     const asset=result.assets?.[0];
     if(!asset?.uri){Alert.alert('Screenshot error','Selected image could not be read.');return}
     const dest=FileSystem.documentDirectory+'payments/';
     await FileSystem.makeDirectoryAsync(dest,{intermediates:true});
     const sourceName=String(asset.fileName||'').trim();
     const ext=sourceName.includes('.')?sourceName.split('.').pop().toLowerCase():'jpg';
     const safeExt=/^(jpg|jpeg|png|webp|heic)$/.test(ext)?ext:'jpg';
     const target=dest+'payment_'+Date.now()+'.'+safeExt;
     await FileSystem.copyAsync({from:asset.uri,to:target});
     const previous=pendingScreenshot.current;
     if(previous&&previous!==target)await FileSystem.deleteAsync(previous,{idempotent:true}).catch(()=>{});
     pendingScreenshot.current=target;
     setScreenshot(target);
   }catch(e){Alert.alert('Screenshot error',e.message)}
 };

 const pay=async()=>{
   if(!sale||busy)return;
   const attachedScreenshot=screenshot;
   try{
     setBusy(true);
     await addPayment({saleId,customerId:sale.customer_id,amount,method,screenshotUri:attachedScreenshot});
     setAmount('');pendingScreenshot.current=null;setScreenshot(null);
     await loadSales();
     const updatedSale=useCRMStore.getState().sales.find(x=>Number(x.id)===Number(saleId));
     if(updatedSale) await invoice(updatedSale,true); else Alert.alert('Success','Payment saved offline.');
   }catch(e){
     if(attachedScreenshot){await FileSystem.deleteAsync(attachedScreenshot,{idempotent:true}).catch(()=>{});if(pendingScreenshot.current===attachedScreenshot)pendingScreenshot.current=null;setScreenshot(null)}
     Alert.alert('Payment error',e.message)
   }finally{setBusy(false)}
 };

 const whatsapp=async()=>{
  if(!sale?.phone){Alert.alert('WhatsApp','Customer phone number unavailable.');return}
  const invoiceNo='INV-'+String(sale.id).padStart(5,'0');
  const invoicePath=FileSystem.documentDirectory+'invoices/'+invoiceNo+'.png';
  try{
    if(!(await FileSystem.getInfoAsync(invoicePath)).exists){
      await generateInvoiceImage(sale,true);
    }
    if(!(await FileSystem.getInfoAsync(invoicePath)).exists){
      Alert.alert('Invoice image unavailable','Generate the invoice image before sending it on WhatsApp.');
      return;
    }
    const digits=String(sale.phone).replace(/\D/g,'');
    const phone=digits.length===10?'91'+digits:digits;
    const message=`Hello ${sale.customer_name}, your welding workshop invoice is ₹${Number(sale.amount).toFixed(2)}. Paid ₹${Number(sale.paid_amount).toFixed(2)}, pending ₹${Number(sale.pending_amount).toFixed(2)}.`;
    await Share.shareSingle({
      title:'Send Invoice on WhatsApp',
      message,
      url:invoicePath,
      type:'image/png',
      social:Share.Social.WHATSAPP,
      whatsAppNumber:phone,
      filename:invoiceNo+'.png'
    });
  }catch(e){
    if(e?.message==='User did not share')return;
    Alert.alert('WhatsApp sharing failed',e?.message||'Invoice could not be shared on WhatsApp.');
  }
 };

 const generateInvoiceImage=async(saleData,showAlert=false)=>{
   if(!invoiceViewRef.current||!saleData)return;
   setInvoiceData(saleData);
   await new Promise(resolve=>setTimeout(resolve,120));
   const uri=await captureRef(invoiceViewRef.current,{format:'png',quality:1,result:'tmpfile'});
   const invoiceNo='INV-'+String(saleData.id).padStart(5,'0');
   const invoiceDir=FileSystem.documentDirectory+'invoices/';
   await FileSystem.makeDirectoryAsync(invoiceDir,{intermediates:true});
   const target=invoiceDir+invoiceNo+'.png';
   await FileSystem.copyAsync({from:uri,to:target});
   await saveInvoice({saleId:saleData.id,invoiceNo,filePath:target,date:new Date().toISOString()});
   if(showAlert)Alert.alert('Invoice ready','PDF generation failed, so an invoice image was saved on this device.');
   return target;
 };

 const exportInvoice=async(filePath,fileName,mimeType)=>{
   try{
     const saved=await saveFileToDevice({sourceUri:filePath,fileName,mimeType});
     if(saved)Alert.alert('Invoice saved','Invoice saved in the Download folder on this device.');
   }catch(e){Alert.alert('Save invoice error',e.message)}
 };

 const invoice=async(saleData=sale,silent=false)=>{
   if(!saleData||(!silent&&busy))return;
   let generatedPdfPath=null,backupPath=null,target=null,committed=false;
   try{
    if(!silent)setBusy(true);
    const invoiceNo='INV-'+String(saleData.id).padStart(5,'0');
    const company=companySettings||{};
    const logoData=company.logo_uri?await toDataUri(company.logo_uri):'';
    const signatureData=company.signature_uri?await toDataUri(company.signature_uri):'';
    const logo=logoData?'<img src="'+logoData+'" style="max-width:180px;max-height:90px"/>':'';
    const signature=signatureData?'<div style="margin-top:28px"><img src="'+signatureData+'" style="max-width:180px;max-height:80px"/><div>Authorized Signature</div></div>':'';
    const terms=escapeHtml(company.terms||'Thank you for your business.');
    const businessName=escapeHtml(company.name||'Welding Workshop');
    const owner=company.owner?'<p><b>Owner:</b> '+escapeHtml(company.owner)+'</p>':'';
    const customerName=escapeHtml(saleData.customer_name||'Customer');
    const customerPhone=escapeHtml(saleData.phone||'');
    const workDescription=escapeHtml(saleData.work_description||'Welding work');
    const html='<html><body style="font-family:Arial;padding:24px">'+logo+'<h1>'+businessName+'</h1>'+owner+'<p><b>Invoice:</b> '+escapeHtml(invoiceNo)+'</p><p><b>Date:</b> '+escapeHtml(saleData.date)+'</p><hr/><h2>'+customerName+'</h2><p>'+customerPhone+'</p><table style="width:100%;border-collapse:collapse"><tr><td>Work</td><td>'+workDescription+'</td></tr><tr><td>Original Amount</td><td>₹'+Number(saleData.original_amount||saleData.amount).toFixed(2)+'</td></tr><tr><td>Discount</td><td>₹'+Number(saleData.discount_amount||0).toFixed(2)+'</td></tr><tr><td>Final Sale Amount</td><td>₹'+Number(saleData.amount).toFixed(2)+'</td></tr><tr><td>Paid</td><td>₹'+Number(saleData.paid_amount).toFixed(2)+'</td></tr><tr><td>Pending</td><td>₹'+Number(saleData.pending_amount).toFixed(2)+'</td></tr></table><p><b>Terms:</b> '+terms+'</p>'+signature+'</body></html>';
    const {generatePDF}=require('react-native-html-to-pdf');
    const result=await generatePDF({html,fileName:invoiceNo});
    generatedPdfPath=result?.filePath||null;
    if(!generatedPdfPath)throw new Error('PDF file was not created.');
    const invoiceDir=FileSystem.documentDirectory+'invoices/';
    await FileSystem.makeDirectoryAsync(invoiceDir,{intermediates:true});
    target=invoiceDir+invoiceNo+'.pdf';
    const existing=await FileSystem.getInfoAsync(target);
    if(existing.exists){backupPath=invoiceDir+invoiceNo+'.backup_'+Date.now()+'.pdf';await FileSystem.moveAsync({from:target,to:backupPath});}
    await FileSystem.copyAsync({from:generatedPdfPath,to:target});
    await saveInvoice({saleId:saleData.id,invoiceNo,pdfPath:target,date:new Date().toISOString()});
    committed=true;
    if(backupPath)await FileSystem.deleteAsync(backupPath,{idempotent:true});
    if(!silent)Alert.alert('Invoice created','PDF saved successfully.');
   }catch(e){
     if(!committed){
       if(target)await FileSystem.deleteAsync(target,{idempotent:true}).catch(()=>{});
       if(backupPath)await FileSystem.moveAsync({from:backupPath,to:target}).catch(()=>{});
     }
     try{await generateInvoiceImage(saleData,!silent)}catch(imageError){if(!silent)Alert.alert('Invoice error',e.message+'\nImage fallback also failed: '+imageError.message);}
   }finally{
     if(generatedPdfPath)await FileSystem.deleteAsync(generatedPdfPath,{idempotent:true}).catch(()=>{});
     if(!silent)setBusy(false);
   }
 };

 if(!sale)return <SafeAreaView style={styles.safe}><Text>Sale not found.</Text></SafeAreaView>;
 return <SafeAreaView style={styles.safe}><ScrollView>
  <Card title={sale.customer_name} subtitle={sale.phone}><Text>Work: {sale.work_description||'General welding work'}</Text><Text style={styles.line}>Original: ₹{Number(sale.original_amount||sale.amount).toFixed(2)} • Discount: ₹{Number(sale.discount_amount||0).toFixed(2)}</Text><Text style={styles.line}>Sale: ₹{Number(sale.amount).toFixed(2)}</Text><Text style={styles.line}>Paid: ₹{Number(sale.paid_amount).toFixed(2)}</Text><Text style={styles.line}>Pending: ₹{Number(sale.pending_amount).toFixed(2)}</Text></Card>
  <Card title="Add Payment">
   <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Payment amount"/>
   <Text style={styles.label}>Method</Text><View style={styles.row}>{METHODS.map(x=><Button key={x} title={x} variant={method===x?'primary':'secondary'} onPress={()=>setMethod(x)}/>)}</View>
   <Button title={screenshot?'Screenshot attached':'Attach payment screenshot'} variant="secondary" onPress={pickScreenshot}/>
   {screenshot&&<Image source={{uri:screenshot}} style={styles.image}/>}
   <Button title="Save Payment" loading={busy} onPress={pay}/>
  </Card>
  <Card title="Invoice"><Button title="Generate Offline PDF Invoice" loading={busy} onPress={()=>invoice()}/><Button title="Generate Invoice Image" variant="secondary" loading={busy} onPress={()=>generateInvoiceImage(sale,true)}/><Button title="Save PDF to Download" variant="secondary" loading={busy} onPress={async()=>{
   const invoiceNo='INV-'+String(sale.id).padStart(5,'0');
   const path=FileSystem.documentDirectory+'invoices/'+invoiceNo+'.pdf';
   if(!(await FileSystem.getInfoAsync(path)).exists){Alert.alert('Invoice not found','Generate the PDF invoice first.');return}
   await exportInvoice(path,invoiceNo+'.pdf','application/pdf');
  }}/><Button title="Save Image to Download" variant="secondary" loading={busy} onPress={async()=>{
   const invoiceNo='INV-'+String(sale.id).padStart(5,'0');
   const path=FileSystem.documentDirectory+'invoices/'+invoiceNo+'.png';
   if(!(await FileSystem.getInfoAsync(path)).exists){Alert.alert('Invoice image not found','Generate the invoice image first.');return}
   await exportInvoice(path,invoiceNo+'.png','image/png');
  }}/><Button title="Send Invoice + Message on WhatsApp" variant="secondary" onPress={whatsapp}/></Card>
  <View ref={invoiceViewRef} collapsable={false} style={styles.invoiceCapture}><Text style={styles.invoiceBrand}>{companySettings?.name||'Welding Workshop'}</Text>{!!companySettings?.owner&&<Text style={styles.invoiceMuted}>Owner: {companySettings.owner}</Text>}<Text style={styles.invoiceHeading}>INVOICE</Text><Text style={styles.invoiceText}>Invoice: INV-{String((invoiceData||sale)?.id||'').padStart(5,'0')}</Text><Text style={styles.invoiceText}>Customer: {(invoiceData||sale)?.customer_name||''}</Text><Text style={styles.invoiceText}>Phone: {(invoiceData||sale)?.phone||''}</Text><Text style={styles.invoiceText}>Work: {(invoiceData||sale)?.work_description||'Welding work'}</Text><Text style={styles.invoiceText}>Original: ₹{Number((invoiceData||sale)?.original_amount||(invoiceData||sale)?.amount||0).toFixed(2)}</Text><Text style={styles.invoiceText}>Discount: ₹{Number((invoiceData||sale)?.discount_amount||0).toFixed(2)}</Text><Text style={styles.invoiceTotal}>Final: ₹{Number((invoiceData||sale)?.amount||0).toFixed(2)}</Text><Text style={styles.invoiceText}>Paid: ₹{Number((invoiceData||sale)?.paid_amount||0).toFixed(2)}</Text><Text style={styles.invoiceText}>Pending: ₹{Number((invoiceData||sale)?.pending_amount||0).toFixed(2)}</Text><Text style={styles.invoiceMuted}>Thank you for your business.</Text></View>
  <Card title="Payment History">{payments.map(p=><View key={p.id} style={styles.history}><Text>₹{Number(p.amount).toFixed(2)} • {p.method}</Text><Text style={styles.muted}>{p.date}</Text>{p.screenshot_uri&&<Text style={styles.muted}>Screenshot saved locally</Text>}</View>)}</Card>
 </ScrollView></SafeAreaView>
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#000000',padding:12},
 line:{marginTop:6},
 label:{fontWeight:'700',marginBottom:7},
 row:{flexDirection:'row',flexWrap:'wrap',gap:6},
 image:{width:'100%',height:180,marginTop:8,borderRadius:10},
 history:{paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#444444'},
 muted:{color:'#ffffff',fontSize:12,marginTop:3},invoiceCapture:{backgroundColor:'#FFFFFF',padding:24,marginTop:12,borderRadius:8},invoiceBrand:{fontSize:24,fontWeight:'800',color:'#111111'},invoiceHeading:{fontSize:20,fontWeight:'800',color:'#111111',marginTop:16},invoiceText:{fontSize:14,color:'#111111',marginTop:8},invoiceTotal:{fontSize:18,fontWeight:'800',color:'#111111',marginTop:12},invoiceMuted:{fontSize:12,color:'#555555',marginTop:8}
});