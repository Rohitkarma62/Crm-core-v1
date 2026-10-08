import React,{useEffect,useRef,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Alert,Image,SafeAreaView,ScrollView,StyleSheet,Text,View,Linking} from 'react-native';
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
  const text=encodeURIComponent(`Hello ${sale.customer_name}, your welding workshop invoice is ₹${Number(sale.amount).toFixed(2)}. Paid ₹${Number(sale.paid_amount).toFixed(2)}, pending ₹${Number(sale.pending_amount).toFixed(2)}.`);
  const digits=String(sale.phone).replace(/\D/g,'');
  const phone=digits.length===10?'91'+digits:digits;
  const url='whatsapp://send?phone='+encodeURIComponent(phone)+'&text='+text;
  try{await Linking.openURL(url)}catch(e){Alert.alert('WhatsApp not available','WhatsApp app is not installed or cannot handle this link.')}
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
    const logo=logoData?'<img src="'+logoData+'" style="width:92px;height:92px;object-fit:contain"/>':'';
    const signature=signatureData?'<div style="text-align:right;margin-top:28px"><img src="'+signatureData+'" style="max-width:160px;max-height:70px;object-fit:contain"/><div style="font-size:11px;color:#666">Authorized Signature</div></div>':'';
    const terms=escapeHtml(company.terms||'Thank you for your business.');
    const businessName=escapeHtml(company.name||'Welding Workshop');
    const owner=company.owner?escapeHtml(company.owner):'';
    const customerName=escapeHtml(saleData.customer_name||'Customer');
    const customerPhone=escapeHtml(saleData.phone||'');
    const workDescription=escapeHtml(saleData.work_description||'Welding work');
    const invoiceDate=escapeHtml(saleData.date||new Date().toISOString().slice(0,10));
    const original=Number(saleData.original_amount||saleData.amount||0).toFixed(2);
    const discount=Number(saleData.discount_amount||0).toFixed(2);
    const finalAmount=Number(saleData.amount||0).toFixed(2);
    const paid=Number(saleData.paid_amount||0).toFixed(2);
    const pending=Number(saleData.pending_amount||0).toFixed(2);
    const status=Number(saleData.pending_amount||0)>0?'PAYMENT PENDING':'PAID';
    const html='<html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:28px;color:#1a1a1a">'+
      '<div style="background:#fff;border:1px solid #d9d9d9;padding:30px;max-width:760px;margin:auto">'+
      '<table style="width:100%;border-collapse:collapse"><tr><td style="vertical-align:top">'+logo+'<div style="font-size:25px;font-weight:bold;margin-top:8px">'+businessName+'</div>'+(owner?'<div style="font-size:12px;color:#666;margin-top:4px">Owner: '+owner+'</div>':'')+
      '</td><td style="text-align:right;vertical-align:top"><div style="font-size:28px;font-weight:bold;letter-spacing:2px">INVOICE</div><div style="font-size:13px;color:#666;margin-top:8px">Invoice No: <b>'+escapeHtml(invoiceNo)+'</b></div><div style="font-size:13px;color:#666;margin-top:4px">Date: '+invoiceDate+'</div><div style="display:inline-block;margin-top:10px;padding:6px 12px;border:1px solid #222;font-size:11px;font-weight:bold">'+status+'</div></td></tr></table>'+
      '<div style="height:1px;background:#222;margin:24px 0"></div>'+
      '<div style="font-size:11px;color:#777;text-transform:uppercase;letter-spacing:1px">Bill To</div><div style="font-size:17px;font-weight:bold;margin-top:5px">'+customerName+'</div><div style="font-size:12px;color:#666;margin-top:3px">'+customerPhone+'</div>'+
      '<table style="width:100%;border-collapse:collapse;margin-top:24px"><tr style="background:#222;color:#fff"><th style="padding:10px;text-align:left">Description</th><th style="padding:10px;text-align:right">Amount</th></tr><tr><td style="padding:14px 10px;border-bottom:1px solid #ddd">'+workDescription+'</td><td style="padding:14px 10px;border-bottom:1px solid #ddd;text-align:right">₹'+original+'</td></tr></table>'+
      '<table style="width:48%;margin-left:auto;border-collapse:collapse;margin-top:18px"><tr><td style="padding:5px;color:#666">Subtotal</td><td style="padding:5px;text-align:right">₹'+original+'</td></tr><tr><td style="padding:5px;color:#666">Discount</td><td style="padding:5px;text-align:right">- ₹'+discount+'</td></tr><tr><td style="padding:10px 5px;border-top:2px solid #222;font-weight:bold;font-size:15px">Grand Total</td><td style="padding:10px 5px;border-top:2px solid #222;text-align:right;font-weight:bold;font-size:15px">₹'+finalAmount+'</td></tr><tr><td style="padding:5px;color:#666">Paid</td><td style="padding:5px;text-align:right">₹'+paid+'</td></tr><tr><td style="padding:5px;font-weight:bold">Balance Due</td><td style="padding:5px;text-align:right;font-weight:bold">₹'+pending+'</td></tr></table>'+
      '<div style="margin-top:26px;padding:14px;background:#f5f5f5;border-left:3px solid #222"><div style="font-size:11px;font-weight:bold;text-transform:uppercase">Terms & Notes</div><div style="font-size:11px;color:#555;margin-top:5px">'+terms+'</div></div>'+
      signature+
      '<div style="margin-top:30px;padding-top:12px;border-top:1px solid #ddd;text-align:center;font-size:10px;color:#777">Computer-generated invoice • '+businessName+' • Thank you for your business</div>'+
      '</div></body></html>';
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
  }}/><Button title="Send Payment Summary on WhatsApp" variant="secondary" onPress={whatsapp}/></Card>
  <View ref={invoiceViewRef} collapsable={false} style={styles.invoiceCapture}>
   <View style={styles.invoiceTop}>
    <View style={styles.invoiceBusiness}>
     <View style={styles.invoiceLogo}><Text style={styles.invoiceLogoText}>VF</Text></View>
     <View><Text style={styles.invoiceBrand}>{companySettings?.name||'Welding Workshop'}</Text>{!!companySettings?.owner&&<Text style={styles.invoiceMuted}>Owner: {companySettings.owner}</Text>}</View>
    </View>
    <View style={styles.invoiceMeta}><Text style={styles.invoiceHeading}>INVOICE</Text><Text style={styles.invoiceMetaText}>No. INV-{String((invoiceData||sale)?.id||'').padStart(5,'0')}</Text><Text style={styles.invoiceMetaText}>Date: {(invoiceData||sale)?.date||''}</Text></View>
   </View>
   <View style={styles.invoiceDivider}/>
   <View style={styles.billRow}><View><Text style={styles.invoiceLabel}>BILL TO</Text><Text style={styles.invoiceCustomer}>{(invoiceData||sale)?.customer_name||''}</Text><Text style={styles.invoiceMuted}>{(invoiceData||sale)?.phone||''}</Text></View><View style={styles.statusBadge}><Text style={styles.statusText}>{Number((invoiceData||sale)?.pending_amount||0)>0?'PAYMENT PENDING':'PAID'}</Text></View></View>
   <View style={styles.invoiceTableHeader}><Text style={styles.tableDescription}>DESCRIPTION</Text><Text style={styles.tableAmount}>AMOUNT</Text></View>
   <View style={styles.invoiceTableRow}><View style={styles.tableDescription}><Text style={styles.invoiceText}>{(invoiceData||sale)?.work_description||'Welding work'}</Text><Text style={styles.invoiceMuted}>Workshop service</Text></View><Text style={styles.tableAmount}>₹{Number((invoiceData||sale)?.original_amount||(invoiceData||sale)?.amount||0).toFixed(2)}</Text></View>
   <View style={styles.invoiceTotals}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>₹{Number((invoiceData||sale)?.original_amount||(invoiceData||sale)?.amount||0).toFixed(2)}</Text><Text style={styles.totalLabel}>Discount</Text><Text style={styles.totalValue}>- ₹{Number((invoiceData||sale)?.discount_amount||0).toFixed(2)}</Text><Text style={styles.grandLabel}>GRAND TOTAL</Text><Text style={styles.grandValue}>₹{Number((invoiceData||sale)?.amount||0).toFixed(2)}</Text><Text style={styles.totalLabel}>Paid</Text><Text style={styles.totalValue}>₹{Number((invoiceData||sale)?.paid_amount||0).toFixed(2)}</Text><Text style={styles.balanceLabel}>BALANCE DUE</Text><Text style={styles.balanceValue}>₹{Number((invoiceData||sale)?.pending_amount||0).toFixed(2)}</Text></View>
   <View style={styles.invoiceNote}><Text style={styles.noteTitle}>TERMS & NOTES</Text><Text style={styles.noteText}>{companySettings?.terms||'Thank you for your business.'}</Text></View>
   <View style={styles.invoiceFooter}><Text style={styles.invoiceMuted}>Computer-generated invoice • Thank you for your business</Text></View>
  </View>
  <Card title="Payment History">{payments.map(p=><View key={p.id} style={styles.history}><Text>₹{Number(p.amount).toFixed(2)} • {p.method}</Text><Text style={styles.muted}>{p.date}</Text>{p.screenshot_uri&&<Text style={styles.muted}>Screenshot saved locally</Text>}</View>)}</Card>
 </ScrollView></SafeAreaView>
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#000000',padding:12},
 line:{marginTop:6},label:{fontWeight:'700',marginBottom:7},row:{flexDirection:'row',flexWrap:'wrap',gap:6},
 image:{width:'100%',height:180,marginTop:8,borderRadius:10},history:{paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#444444'},muted:{color:'#ffffff',fontSize:12,marginTop:3},
 invoiceCapture:{backgroundColor:'#FFFFFF',padding:26,marginTop:12,borderRadius:10},
 invoiceTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},invoiceBusiness:{flexDirection:'row',alignItems:'center',gap:10,flex:1},
 invoiceLogo:{width:52,height:52,borderRadius:8,borderWidth:2,borderColor:'#111111',alignItems:'center',justifyContent:'center'},invoiceLogoText:{fontSize:20,fontWeight:'900',color:'#111111'},
 invoiceBrand:{fontSize:20,fontWeight:'900',color:'#111111',maxWidth:190},invoiceHeading:{fontSize:24,fontWeight:'900',letterSpacing:2,color:'#111111',textAlign:'right'},invoiceMeta:{alignItems:'flex-end'},invoiceMetaText:{fontSize:11,color:'#555555',marginTop:3},
 invoiceDivider:{height:2,backgroundColor:'#111111',marginVertical:18},billRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},invoiceLabel:{fontSize:9,fontWeight:'800',letterSpacing:1.2,color:'#777777'},invoiceCustomer:{fontSize:15,fontWeight:'800',color:'#111111',marginTop:4},
 statusBadge:{borderWidth:1,borderColor:'#111111',paddingHorizontal:9,paddingVertical:5,borderRadius:4},statusText:{fontSize:9,fontWeight:'900',color:'#111111'},
 invoiceTableHeader:{flexDirection:'row',backgroundColor:'#111111',paddingVertical:9,paddingHorizontal:10,marginTop:20},tableDescription:{flex:1,fontSize:10,fontWeight:'800',color:'#FFFFFF',letterSpacing:.5},tableAmount:{width:100,fontSize:10,fontWeight:'800',color:'#FFFFFF',textAlign:'right'},
 invoiceTableRow:{flexDirection:'row',paddingVertical:14,paddingHorizontal:10,borderBottomWidth:1,borderBottomColor:'#DDDDDD'},invoiceText:{fontSize:13,color:'#111111',marginTop:3},invoiceMuted:{fontSize:10,color:'#666666',marginTop:3},
 invoiceTotals:{alignSelf:'flex-end',width:230,marginTop:14},totalLabel:{fontSize:11,color:'#666666',marginTop:5},totalValue:{fontSize:11,color:'#111111',textAlign:'right',marginTop:-14},grandLabel:{fontSize:12,fontWeight:'900',color:'#111111',borderTopWidth:2,borderTopColor:'#111111',paddingTop:9,marginTop:9},grandValue:{fontSize:16,fontWeight:'900',color:'#111111',textAlign:'right',marginTop:-18},balanceLabel:{fontSize:12,fontWeight:'900',color:'#111111',marginTop:10},balanceValue:{fontSize:13,fontWeight:'900',color:'#111111',textAlign:'right',marginTop:-18},
 invoiceNote:{marginTop:20,padding:12,backgroundColor:'#F4F4F4',borderLeftWidth:3,borderLeftColor:'#111111'},noteTitle:{fontSize:9,fontWeight:'900',letterSpacing:1,color:'#333333'},noteText:{fontSize:10,color:'#555555',marginTop:5},invoiceFooter:{marginTop:20,paddingTop:10,borderTopWidth:1,borderTopColor:'#DDDDDD',alignItems:'center'}
});;