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
      <View style={s.invoiceTop}><View style={s.invoiceBusiness}><View style={s.invoiceLogo}><Text style={s.invoiceLogoText}>VF</Text></View><View><Text style={s.invoiceBrand}>{companySettings?.name||'Welding Workshop'}</Text>{!!companySettings?.owner&&<Text style={s.invoiceMuted}>Owner: {companySettings.owner}</Text>}</View></View><View style={s.invoiceMeta}><Text style={s.invoiceTitle}>INVOICE</Text><Text style={s.invoiceMetaText}>No. INV-{invoiceSale?.id||''}</Text><Text style={s.invoiceMetaText}>Date: {invoiceSale?.date||''}</Text></View></View>
      <View style={s.invoiceLineStrong}/>
      <View style={s.billRow}><View><Text style={s.invoiceLabel}>BILL TO</Text><Text style={s.invoiceCustomer}>{profile?.customer?.name||''}</Text><Text style={s.invoiceMuted}>{profile?.customer?.phone||''}</Text></View><View style={s.statusBadge}><Text style={s.statusText}>{Number(invoiceSale?.pending_amount||0)>0?'PAYMENT PENDING':'PAID'}</Text></View></View>
      <View style={s.invoiceTableHeader}><Text style={s.tableDescription}>DESCRIPTION</Text><Text style={s.tableAmount}>AMOUNT</Text></View>
      <View style={s.invoiceTableRow}><View style={s.tableDescription}><Text style={s.invoiceText}>{invoiceSale?.work_description||'General welding work'}</Text><Text style={s.invoiceMuted}>Workshop service</Text></View><Text style={s.tableAmount}>₹{Number(invoiceSale?.original_amount||invoiceSale?.amount||0).toFixed(2)}</Text></View>
      <View style={s.invoiceTotals}><Text style={s.totalLabel}>Subtotal</Text><Text style={s.totalValue}>₹{Number(invoiceSale?.original_amount||invoiceSale?.amount||0).toFixed(2)}</Text><Text style={s.totalLabel}>Discount</Text><Text style={s.totalValue}>- ₹{Number(invoiceSale?.discount_amount||0).toFixed(2)}</Text><Text style={s.grandLabel}>GRAND TOTAL</Text><Text style={s.grandValue}>₹{Number(invoiceSale?.amount||0).toFixed(2)}</Text><Text style={s.totalLabel}>Paid</Text><Text style={s.totalValue}>₹{Number(invoiceSale?.paid_amount||0).toFixed(2)}</Text><Text style={s.balanceLabel}>BALANCE DUE</Text><Text style={s.balanceValue}>₹{Number(invoiceSale?.pending_amount||0).toFixed(2)}</Text></View>
      <View style={s.invoiceNote}><Text style={s.noteTitle}>TERMS & NOTES</Text><Text style={s.noteText}>{companySettings?.terms||'Thank you for your business.'}</Text></View>
      <View style={s.invoiceFooter}><Text style={s.invoiceMuted}>Computer-generated invoice • Thank you for your business</Text></View>
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
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg,padding:spacing.lg},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:spacing.sm},title:{...typography.display,color:colors.text},grid:{gap:6,marginTop:spacing.md},row:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:spacing.md},line:{marginTop:8,color:colors.text},empty:{textAlign:'center',marginTop:30,color:colors.muted},form:{padding:spacing.lg,paddingBottom:spacing.xxl},invoice:{backgroundColor:'#FFFFFF',padding:26,borderRadius:10},invoiceTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},invoiceBusiness:{flexDirection:'row',alignItems:'center',gap:10,flex:1},invoiceLogo:{width:52,height:52,borderRadius:8,borderWidth:2,borderColor:'#111111',alignItems:'center',justifyContent:'center'},invoiceLogoText:{fontSize:20,fontWeight:'900',color:'#111111'},invoiceBrand:{fontSize:20,fontWeight:'900',color:'#111111',maxWidth:170},invoiceMuted:{fontSize:10,color:'#666666',marginTop:3},invoiceMeta:{alignItems:'flex-end'},invoiceTitle:{fontSize:24,fontWeight:'900',letterSpacing:2,color:'#111111'},invoiceMetaText:{fontSize:11,color:'#555555',marginTop:3},invoiceLineStrong:{height:2,backgroundColor:'#111111',marginVertical:18},billRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},invoiceLabel:{fontSize:9,fontWeight:'800',letterSpacing:1.2,color:'#777777'},invoiceCustomer:{fontSize:15,fontWeight:'800',color:'#111111',marginTop:4},statusBadge:{borderWidth:1,borderColor:'#111111',paddingHorizontal:9,paddingVertical:5,borderRadius:4},statusText:{fontSize:9,fontWeight:'900',color:'#111111'},invoiceTableHeader:{flexDirection:'row',backgroundColor:'#111111',paddingVertical:9,paddingHorizontal:10,marginTop:20},tableDescription:{flex:1,fontSize:10,fontWeight:'800',color:'#FFFFFF',letterSpacing:.5},tableAmount:{width:100,fontSize:10,fontWeight:'800',color:'#FFFFFF',textAlign:'right'},invoiceTableRow:{flexDirection:'row',paddingVertical:14,paddingHorizontal:10,borderBottomWidth:1,borderBottomColor:'#DDDDDD'},invoiceText:{fontSize:13,color:'#111111',marginTop:3},invoiceTotals:{alignSelf:'flex-end',width:220,marginTop:14},totalLabel:{fontSize:11,color:'#666666',marginTop:5},totalValue:{fontSize:11,color:'#111111',textAlign:'right',marginTop:-14},grandLabel:{fontSize:12,fontWeight:'900',color:'#111111',borderTopWidth:2,borderTopColor:'#111111',paddingTop:9,marginTop:9},grandValue:{fontSize:16,fontWeight:'900',color:'#111111',textAlign:'right',marginTop:-18},balanceLabel:{fontSize:12,fontWeight:'900',color:'#111111',marginTop:10},balanceValue:{fontSize:13,fontWeight:'900',color:'#111111',textAlign:'right',marginTop:-18},invoiceNote:{marginTop:20,padding:12,backgroundColor:'#F4F4F4',borderLeftWidth:3,borderLeftColor:'#111111'},noteTitle:{fontSize:9,fontWeight:'900',letterSpacing:1,color:'#333333'},noteText:{fontSize:10,color:'#555555',marginTop:5},invoiceFooter:{marginTop:20,paddingTop:10,borderTopWidth:1,borderTopColor:'#DDDDDD',alignItems:'center'},invoiceImage:{width:'100%',height:520,marginTop:16,backgroundColor:'#222222'},historyItem:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.border},bold:{...typography.bodyStrong,color:colors.text},muted:{color:colors.muted,marginTop:3},profilePhone:{...typography.body,color:colors.muted}});
