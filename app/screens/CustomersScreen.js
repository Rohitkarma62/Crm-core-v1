import React,{useRef,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Alert,FlatList,Image,Modal,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Card from '../../components/Card';
import {colors,spacing,typography} from '../../theme';
import Button from '../../components/Button';
import * as FileSystem from 'expo-file-system/legacy';
import {captureRef} from 'react-native-view-shot';
import {saveFileToDevice} from '../../app/core/fileStorage';

export default function CustomersScreen({navigation}){
 const {customers,loadCustomers,loadCustomerProfile,deleteCustomer,loadCompanySettings,saveInvoice,companySettings}=useCRMStore();
 const [profile,setProfile]=useState(null),[busy,setBusy]=useState(false),[invoiceSale,setInvoiceSale]=useState(null),[generatedInvoiceUri,setGeneratedInvoiceUri]=useState(null),[invoiceBusy,setInvoiceBusy]=useState(false);
 const invoiceRef=useRef(null);
 useFocusEffect(React.useCallback(()=>{loadCompanySettings().catch(()=>{})},[loadCompanySettings]));
 useFocusEffect(React.useCallback(()=>{loadCustomers().catch(()=>{})},[loadCustomers]));
 const openProfile=async customer=>{
  try{setBusy(true);const data=await loadCustomerProfile(customer.id);setProfile(data)}catch(e){Alert.alert('Profile error',e.message)}finally{setBusy(false)}
 };
 const remove=customer=>Alert.alert('Delete customer?','Customer, sales, payments and invoices linked to this customer will be deleted.',[
  {text:'Cancel'},
  {text:'Delete',style:'destructive',onPress:async()=>{try{setBusy(true);await deleteCustomer(customer.id)}catch(e){Alert.alert('Delete error',e.message)}finally{setBusy(false)}}}
 ]);
 return <SafeAreaView style={s.safe}>
  <View style={s.header}><Text style={s.title}>Customers</Text><Button title="Refresh" variant="secondary" onPress={()=>loadCustomers()}/></View>
  <FlatList data={customers} keyExtractor={x=>String(x.id)} renderItem={({item})=><Card title={item.name} subtitle={item.phone}>
   <View style={s.grid}><Text>Total Sales: ₹{Number(item.total_sales||0).toFixed(2)}</Text><Text>Paid: ₹{Number(item.total_paid||0).toFixed(2)}</Text><Text>Pending: ₹{Number(item.pending_amount||0).toFixed(2)}</Text><Text>Sales: {item.sale_count||0}</Text></View>
   <View style={s.row}><Button title="New Sale" onPress={()=>navigation.navigate("Sales",{customerId:item.id})}/><Button title="Profile" onPress={()=>openProfile(item)}/><Button title="Delete" variant="danger" loading={busy} onPress={()=>remove(item)}/></View>
  </Card>} ListEmptyComponent={<Text style={s.empty}>No customers yet. Convert a lead to create one.</Text>}/>
  <Modal visible={!!profile} animationType="slide" onRequestClose={()=>setProfile(null)}>
   <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.form}>
    <Text style={s.title}>{profile?.customer?.name}</Text><Text>{profile?.customer?.phone}</Text>
    <Card title="Customer Summary"><Text>Total Jobs: {profile?.stats?.totalJobs||0}</Text><Text style={s.line}>Total Paid: ₹{Number(profile?.stats?.totalPaid||0).toFixed(2)}</Text><Text style={s.line}>Total Pending: ₹{Number(profile?.stats?.totalPending||0).toFixed(2)}</Text><Text style={s.line}>Lifetime Work: ₹{Number(profile?.stats?.totalSpent||0).toFixed(2)}</Text><Text style={s.line}>Total Discount Given: ₹{Number(profile?.stats?.totalDiscount||0).toFixed(2)}</Text><Text style={s.line}>Average Job: ₹{Number(profile?.stats?.averageJob||0).toFixed(2)}</Text><Text style={s.line}>Average Discount: {Number(profile?.stats?.discountRate||0).toFixed(1)}%</Text><Text style={s.line}>Last Job: {profile?.stats?.lastJobDate||'No job yet'}</Text></Card>
    <Card title="Work History">{profile?.sales?.length?profile.sales.map(x=><View key={x.id} style={s.historyItem}><Text style={s.bold}>{x.work_description||'General welding work'}</Text><Text>Final: ₹{Number(x.amount).toFixed(2)} • Paid: ₹{Number(x.paid_amount||0).toFixed(2)} • Pending: ₹{Number(x.pending_amount||0).toFixed(2)} • {x.status}</Text><Text>Original: ₹{Number(x.original_amount||x.amount).toFixed(2)} • Discount: ₹{Number(x.discount_amount||0).toFixed(2)}</Text><Text style={s.muted}>{x.date}</Text><View style={s.row}><Button title="Invoice Image" onPress={()=>{setGeneratedInvoiceUri(null);setInvoiceSale(x)}}/></View></View>):<Text>No work history yet.</Text>}</Card>
    <Card title="Payment History">{profile?.payments?.length?profile.payments.map(x=><Text key={x.id} style={s.line}>₹{Number(x.amount).toFixed(2)} • {x.method} • {x.date}</Text>):<Text>No payments.</Text>}</Card>
    <Card title="Invoices">{profile?.invoices?.length?profile.invoices.map(x=><Text key={x.id} style={s.line}>{x.invoice_no} • {x.date}</Text>):<Text>No invoices.</Text>}</Card>
    <Button title="New Sale for this Customer" onPress={()=>{setProfile(null);navigation.navigate('Sales',{customerId:profile?.customer?.id})}}/>
    <Button title="Close" variant="secondary" onPress={()=>setProfile(null)}/>
   </ScrollView></SafeAreaView>
  </Modal>
  <Modal visible={!!invoiceSale} animationType="slide" onRequestClose={()=>{if(!invoiceBusy)setInvoiceSale(null)}}>
   <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.form}>
     <View ref={invoiceRef} collapsable={false} style={s.invoice}>
      <Text style={s.invoiceBrand}>{profile?.customer?.name ? (companySettings?.name||'WORKSHOP INVOICE') : 'WORKSHOP INVOICE'}</Text>
      <Text style={s.invoiceOwner}>{companySettings?.owner||''}</Text>
      <Text style={s.invoiceTitle}>INVOICE</Text>
      <View style={s.invoiceLine}/><Text style={s.invoiceText}>Invoice No: INV-{invoiceSale?.id||''}</Text>
      <Text style={s.invoiceText}>Date: {invoiceSale?.date||''}</Text>
      <Text style={s.invoiceText}>Customer: {profile?.customer?.name||''}</Text>
      <Text style={s.invoiceText}>Phone: {profile?.customer?.phone||''}</Text>
      <View style={s.invoiceLine}/>
      <Text style={s.invoiceText}>Work: {invoiceSale?.work_description||'General welding work'}</Text>
      <Text style={s.invoiceText}>Original Amount: ₹{Number(invoiceSale?.original_amount||invoiceSale?.amount||0).toFixed(2)}</Text>
      <Text style={s.invoiceText}>Discount: ₹{Number(invoiceSale?.discount_amount||0).toFixed(2)}</Text>
      <Text style={s.invoiceTotal}>Final Amount: ₹{Number(invoiceSale?.amount||0).toFixed(2)}</Text>
      <Text style={s.invoiceText}>Paid: ₹{Number(invoiceSale?.paid_amount||0).toFixed(2)}</Text>
      <Text style={s.invoiceText}>Pending: ₹{Number(invoiceSale?.pending_amount||0).toFixed(2)}</Text>
      <View style={s.invoiceLine}/><Text style={s.invoiceThanks}>Thank you for your business.</Text>
     </View>
     {generatedInvoiceUri&&<Image source={{uri:generatedInvoiceUri}} style={s.invoiceImage} resizeMode="contain"/>}
     <Button title="Save Invoice Image to Download" variant="secondary" loading={invoiceBusy} onPress={async()=>{
       if(!invoiceSale||invoiceBusy)return;
       try{
        setInvoiceBusy(true);
        const source=FileSystem.documentDirectory+'invoices/INV-'+invoiceSale.id+'.png';
        if(!(await FileSystem.getInfoAsync(source)).exists){Alert.alert('Invoice image not found','Generate the invoice image first.');return}
        const saved=await saveFileToDevice({sourceUri:source,fileName:'INV-'+invoiceSale.id+'.png',mimeType:'image/png'});
        if(saved)Alert.alert('Invoice saved','Invoice image saved in the Download folder on this device.');
       }catch(e){Alert.alert('Save invoice error',e.message)}finally{setInvoiceBusy(false)}
     }}/>
     <Button title="Generate & Save Invoice Image" loading={invoiceBusy} onPress={async()=>{
       if(!invoiceRef.current||invoiceBusy)return;
       try{
        setInvoiceBusy(true);
        const uri=await captureRef(invoiceRef.current,{format:'png',quality:1,result:'tmpfile'});
        const dir=(FileSystem.documentDirectory||'')+'invoices/';
        await FileSystem.makeDirectoryAsync(dir,{intermediates:true});
        const target=dir+'INV-'+invoiceSale.id+'.png';
        await FileSystem.copyAsync({from:uri,to:target});
        const invoiceNo='INV-'+invoiceSale.id;
        await saveInvoice({saleId:invoiceSale.id,invoiceNo,filePath:target,date:invoiceSale.date});
        setGeneratedInvoiceUri(target);
        const refreshed=await loadCustomerProfile(profile.customer.id);
        setProfile(refreshed);
        Alert.alert('Invoice ready','Invoice image saved on this device.');
       }catch(e){Alert.alert('Invoice error',e.message)}finally{setInvoiceBusy(false)}
     }}/>
     <Button title="Close" variant="secondary" onPress={()=>{if(!invoiceBusy){setInvoiceSale(null);setGeneratedInvoiceUri(null)}}}/>
    </ScrollView>
   </SafeAreaView>
  </Modal>
 </SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg,padding:spacing.lg},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:spacing.sm},title:{...typography.display,color:colors.text},grid:{gap:6,marginTop:spacing.md},row:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:spacing.md},line:{marginTop:8,color:colors.text},empty:{textAlign:'center',marginTop:30,color:colors.muted},form:{padding:spacing.lg,paddingBottom:spacing.xxl},invoice:{backgroundColor:'#FFFFFF',padding:24,borderRadius:8},invoiceBrand:{fontSize:24,fontWeight:'800',color:'#111111'},invoiceOwner:{fontSize:13,color:'#555555',marginTop:4},invoiceTitle:{fontSize:20,fontWeight:'800',color:'#111111',marginTop:18},invoiceText:{fontSize:14,color:'#111111',marginTop:8},invoiceTotal:{fontSize:18,fontWeight:'800',color:'#111111',marginTop:14},invoiceThanks:{fontSize:13,color:'#555555',marginTop:14},invoiceLine:{height:1,backgroundColor:'#DDDDDD',marginVertical:12},invoiceImage:{width:'100%',height:520,marginTop:16,backgroundColor:'#222222'},historyItem:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.border},bold:{...typography.bodyStrong,color:colors.text},muted:{color:colors.muted,marginTop:3},profilePhone:{...typography.body,color:colors.muted}});
