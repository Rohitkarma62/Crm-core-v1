import React,{useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Alert,FlatList,Modal,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function CustomersScreen({navigation}){
 const {customers,loadCustomers,loadCustomerProfile,deleteCustomer}=useCRMStore();
 const [profile,setProfile]=useState(null),[busy,setBusy]=useState(false);
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
    <Card title="Customer Summary"><Text>Total Jobs: {profile?.stats?.totalJobs||0}</Text><Text style={s.line}>Lifetime Work: ₹{Number(profile?.stats?.totalSpent||0).toFixed(2)}</Text><Text style={s.line}>Total Discount Given: ₹{Number(profile?.stats?.totalDiscount||0).toFixed(2)}</Text><Text style={s.line}>Average Job: ₹{Number(profile?.stats?.averageJob||0).toFixed(2)}</Text><Text style={s.line}>Last Job: {profile?.stats?.lastJobDate||'No job yet'}</Text></Card>
    <Card title="Work History">{profile?.sales?.length?profile.sales.map(x=><View key={x.id} style={s.historyItem}><Text style={s.bold}>{x.work_description||'General welding work'}</Text><Text>Final: ₹{Number(x.amount).toFixed(2)} • {x.status}</Text><Text>Original: ₹{Number(x.original_amount||x.amount).toFixed(2)} • Discount: ₹{Number(x.discount_amount||0).toFixed(2)}</Text><Text style={s.muted}>{x.date}</Text></View>):<Text>No work history yet.</Text>}</Card>
    <Card title="Payment History">{profile?.payments?.length?profile.payments.map(x=><Text key={x.id} style={s.line}>₹{Number(x.amount).toFixed(2)} • {x.method} • {x.date}</Text>):<Text>No payments.</Text>}</Card>
    <Card title="Invoices">{profile?.invoices?.length?profile.invoices.map(x=><Text key={x.id} style={s.line}>{x.invoice_no} • {x.date}</Text>):<Text>No invoices.</Text>}</Card>
    <Button title="New Sale for this Customer" onPress={()=>{setProfile(null);navigation.navigate('Sales',{customerId:profile?.customer?.id})}}/>
    <Button title="Close" variant="secondary" onPress={()=>setProfile(null)}/>
   </ScrollView></SafeAreaView>
  </Modal>
 </SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#ffffff',padding:12},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:25,fontWeight:'800',color:'#111111'},grid:{gap:7,marginTop:10},row:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8},line:{marginTop:8},empty:{textAlign:'center',marginTop:30,color:'#555555'},form:{paddingBottom:20},historyItem:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#dddddd'},bold:{fontWeight:'800'},muted:{color:'#555555',marginTop:3}});
