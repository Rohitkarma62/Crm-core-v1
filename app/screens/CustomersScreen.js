import React,{useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Alert,FlatList,Modal,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function CustomersScreen({navigation}){
 const {customers,loadCustomers,loadCustomerHistory,deleteCustomer}=useCRMStore();
 const [history,setHistory]=useState(null),[busy,setBusy]=useState(false);
 useFocusEffect(React.useCallback(()=>{loadCustomers().catch(()=>{})},[loadCustomers]));
 const openHistory=async customer=>{
  try{setBusy(true);const data=await loadCustomerHistory(customer.id);setHistory({customer,data})}
  catch(e){Alert.alert('History error',e.message)}
  finally{setBusy(false)}
 };
 const remove=customer=>Alert.alert('Delete customer?','Customer, sales, payments and invoices linked to this customer will be deleted.',[
  {text:'Cancel'},
  {text:'Delete',style:'destructive',onPress:async()=>{try{setBusy(true);await deleteCustomer(customer.id)}catch(e){Alert.alert('Delete error',e.message)}finally{setBusy(false)}}}
 ]);
 return <SafeAreaView style={s.safe}>
  <View style={s.header}><Text style={s.title}>Customers</Text><Button title="Refresh" variant="secondary" onPress={()=>loadCustomers()}/></View>
  <FlatList data={customers} keyExtractor={x=>String(x.id)} renderItem={({item})=><Card title={item.name} subtitle={item.phone}>
   <View style={s.grid}><Text>Total Sales: ₹{Number(item.total_sales||0).toFixed(2)}</Text><Text>Paid: ₹{Number(item.total_paid||0).toFixed(2)}</Text><Text>Pending: ₹{Number(item.pending_amount||0).toFixed(2)}</Text><Text>Sales: {item.sale_count||0}</Text></View>
   <View style={s.row}><Button title="New Sale" onPress={()=>navigation.navigate("Sales",{customerId:item.id})}/><Button title="History" variant="secondary" onPress={()=>openHistory(item)}/><Button title="Delete" variant="danger" loading={busy} onPress={()=>remove(item)}/></View>
  </Card>} ListEmptyComponent={<Text style={s.empty}>No customers yet. Convert a lead to create one.</Text>}/>
  <Modal visible={!!history} animationType="slide" onRequestClose={()=>setHistory(null)}>
   <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.form}>
    <Text style={s.title}>{history?.customer?.name}</Text><Text>{history?.customer?.phone}</Text>
    <Card title="Sales">{history?.data.sales?.length?history.data.sales.map(x=><Text key={x.id} style={s.line}>₹{Number(x.amount).toFixed(2)} • {x.status} • {x.date}</Text>):<Text>No sales.</Text>}</Card>
    <Card title="Payments">{history?.data.payments?.length?history.data.payments.map(x=><Text key={x.id} style={s.line}>₹{Number(x.amount).toFixed(2)} • {x.method} • {x.date}</Text>):<Text>No payments.</Text>}</Card>
    <Card title="Invoices">{history?.data.invoices?.length?history.data.invoices.map(x=><Text key={x.id} style={s.line}>{x.invoice_no} • {x.date}</Text>):<Text>No invoices.</Text>}</Card>
    <Button title="Close" variant="secondary" onPress={()=>setHistory(null)}/>
   </ScrollView></SafeAreaView>
  </Modal>
 </SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#ffffff',padding:12},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:25,fontWeight:'800',color:'#111111'},grid:{gap:7,marginTop:10},row:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8},line:{marginTop:8},empty:{textAlign:'center',marginTop:30,color:'#555555'},form:{paddingBottom:20}});
