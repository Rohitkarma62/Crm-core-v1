import React,{useEffect,useRef,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Alert,Image,SafeAreaView,ScrollView,StyleSheet,Text,View,Linking} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {PAYMENT_METHODS} from '../../app/core/constants';
import {escapeHtml} from '../../app/core/validation';
import {useCRMStore} from '../../store/useCRMStore';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';

const METHODS=PAYMENT_METHODS;

const imageMimeFromUri=(uri)=>{const ext=String(uri||'').split('?')[0].split('.').pop()?.toLowerCase();if(ext==='png')return'image/png';if(ext==='webp')return'image/webp';if(ext==='heic')return'image/heic';return'image/jpeg'};
const toDataUri=async(uri)=>{if(!uri)return'';const base64=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64});return`data:${imageMimeFromUri(uri)};base64,${base64}`};

export default function PaymentsScreen({route}){
 const saleId=route.params?.saleId;
 const {sales,loadSales,payments,loadPayments,addPayment,saveInvoice,companySettings,loadCompanySettings}=useCRMStore();
 const sale=sales.find(x=>Number(x.id)===Number(saleId));
 const [amount,setAmount]=useState(''),[method,setMethod]=useState('Cash'),[screenshot,setScreenshot]=useState(null),[busy,setBusy]=useState(false);
 const pendingScreenshot=useRef(null);
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
     const previous=pendingScreenshot.current;
     await FileSystem.copyAsync({from:asset.uri,to:target});
     if(previous&&previous!==target)await FileSystem.deleteAsync(previous,{idempotent:true}).catch(()=>{});
     pendingScreenshot.current=target;
     setScreenshot(target);
   }catch(e){Alert.alert('Screenshot error',e.message)}
 };

 const pay=async()=>{
   if(!sale)return;
   const attachedScreenshot=screenshot;
   try{
     setBusy(true);
     await addPayment({saleId,customerId:sale.customer_id,amount,method,screenshotUri:attachedScreenshot});
     setAmount('');
     pendingScreenshot.current=null;
     setScreenshot(null);
     Alert.alert('Success','Payment saved offline.');
   }catch(e){
     if(attachedScreenshot){
       try{await FileSystem.deleteAsync(attachedScreenshot,{idempotent:true})}catch{}
       pendingScreenshot.current=null;
       setScreenshot(null);
     }
     Alert.alert('Payment error',e.message);
   }finally{setBusy(false)}
 };

 const whatsapp=async()=>{
  if(!sale?.phone){Alert.alert('WhatsApp','Customer phone number unavailable.');return}
  const text=encodeURIComponent(`Hello ${sale.customer_name}, your welding workshop invoice is ₹${Number(sale.amount).toFixed(2)}. Paid ₹${Number(sale.paid_amount).toFixed(2)}, pending ₹${Number(sale.pending_amount).toFixed(2)}.`);
  const digits=String(sale.phone).replace(/\D/g,'');
  const phone=digits.length===10?'91'+digits:digits;
  const url='whatsapp://send?phone='+encodeURIComponent(phone)+'&text='+text;
  try{await Linking.openURL(url)}catch{Alert.alert('WhatsApp not available','WhatsApp app is not installed or cannot handle this link.')}
 };

 const invoice=async()=>{
   if(!sale)return;
   const invoiceNo='INV-'+String(sale.id).padStart(5,'0');
   const target=FileSystem.documentDirectory+'invoices/'+invoiceNo+'.pdf';
   let targetCreated=false;
   try{
    setBusy(true);
    const company=companySettings||{};
    const logoData=company.logo_uri?await toDataUri(company.logo_uri):'';
    const signatureData=company.signature_uri?await toDataUri(company.signature_uri):'';
    const logo=logoData?`<img src="${logoData}" style="max-width:180px;max-height:90px"/>`:'';
    const signature=signatureData?`<div style="margin-top:28px"><img src="${signatureData}" style="max-width:180px;max-height:80px"/><div>Authorized Signature</div></div>`:'';
    const terms=escapeHtml(company.terms||'Thank you for your business.');
    const businessName=escapeHtml(company.name||'Welding Workshop');
    const owner=company.owner?`<p><b>Owner:</b> ${escapeHtml(company.owner)}</p>`:'';
    const customerName=escapeHtml(sale.customer_name||'Customer');
    const customerPhone=escapeHtml(sale.phone||'');
    const workDescription=escapeHtml(sale.work_description||'Welding work');
    const html=`<html><body style="font-family:Arial;padding:24px">${logo}<h1>${businessName}</h1>${owner}<p><b>Invoice:</b> ${escapeHtml(invoiceNo)}</p><p><b>Date:</b> ${escapeHtml(sale.date)}</p><hr/><h2>${customerName}</h2><p>${customerPhone}</p><table style="width:100%;border-collapse:collapse"><tr><td>Work</td><td>${workDescription}</td></tr><tr><td>Original Amount</td><td>₹${Number(sale.original_amount||sale.amount).toFixed(2)}</td></tr><tr><td>Discount</td><td>₹${Number(sale.discount_amount||0).toFixed(2)}</td></tr><tr><td>Final Sale Amount</td><td>₹${Number(sale.amount).toFixed(2)}</td></tr><tr><td>Paid</td><td>₹${Number(sale.paid_amount).toFixed(2)}</td></tr><tr><td>Pending</td><td>₹${Number(sale.pending_amount).toFixed(2)}</td></tr></table><p><b>Terms:</b> ${terms}</p>${signature}</body></html>`;
    const {generatePDF}=require('react-native-html-to-pdf');
    const result=await generatePDF({html,fileName:invoiceNo});
    if(!result?.filePath)throw new Error('PDF file was not created.');
    const invoiceDir=FileSystem.documentDirectory+'invoices/';
    await FileSystem.makeDirectoryAsync(invoiceDir,{intermediates:true});
    const existing=await FileSystem.getInfoAsync(target);
    const hadExisting=!!existing.exists;
    const backup=invoiceDir+'.'+invoiceNo+'.backup_'+Date.now()+'.pdf';
    if(hadExisting)await FileSystem.copyAsync({from:target,to:backup});
    try{
      if(hadExisting)await FileSystem.deleteAsync(target,{idempotent:true});
      await FileSystem.copyAsync({from:result.filePath,to:target});
      targetCreated=true;
      await saveInvoice({saleId,invoiceNo,pdfPath:target,date:new Date().toISOString()});
      if(hadExisting)await FileSystem.deleteAsync(backup,{idempotent:true});
    }catch(error){
      if(targetCreated)await FileSystem.deleteAsync(target,{idempotent:true}).catch(()=>{});
      if(hadExisting){
        await FileSystem.deleteAsync(target,{idempotent:true}).catch(()=>{});
        await FileSystem.copyAsync({from:backup,to:target}).catch(()=>{});
        await FileSystem.deleteAsync(backup,{idempotent:true}).catch(()=>{});
      }
      targetCreated=false;
      throw error;
    }
    Alert.alert('Invoice created','PDF saved successfully.');
   }catch(e){
    if(targetCreated){try{await FileSystem.deleteAsync(target,{idempotent:true})}catch{}}
    Alert.alert('Invoice error',e.message)
   }finally{setBusy(false)}
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
  <Card title="Invoice"><Button title="Generate Offline PDF Invoice" loading={busy} onPress={invoice}/><Button title="Send Payment Summary on WhatsApp" variant="secondary" onPress={whatsapp}/></Card>
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
 muted:{color:'#ffffff',fontSize:12,marginTop:3}
});