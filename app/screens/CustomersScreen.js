import React,{useEffect} from 'react';
import {Alert,FlatList,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function CustomersScreen({route,navigation}){
 const {customers,loadCustomers,loadCustomerHistory,deleteCustomer}=useCRMStore();
 useEffect(()=>{loadCustomers()},[]);
 return <SafeAreaView style={styles.safe}>
  <View style={styles.header}><Text style={styles.title}>Customers</Text><Button title="Refresh" variant="secondary" onPress={loadCustomers}/></View>
  <FlatList data={customers} keyExtractor={x=>String(x.id)} renderItem={({item})=><Card title={item.name} subtitle={item.phone}>
    <View style={styles.grid}><Text>Total Sales: ₹{Number(item.total_sales||0).toFixed(2)}</Text><Text>Paid: ₹{Number(item.total_paid||0).toFixed(2)}</Text><Text>Pending: ₹{Number(item.pending_amount||0).toFixed(2)}</Text><Text>Sales: {item.sale_count||0}</Text><Button title="History" variant="secondary" onPress={async()=>{const h=await loadCustomerHistory(item.id);Alert.alert('Customer History','Sales: '+h.sales.length+'\nPayments: '+h.payments.length+'\nInvoices: '+h.invoices.length)}}/><Button title="Delete Customer" variant="danger" onPress={()=>Alert.alert('Delete customer?','Customer, sales, payments and invoices linked to this customer will be deleted.',[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>deleteCustomer(item.id)}])}/></View>
  </Card>} ListEmptyComponent={<Text style={styles.empty}>No customers yet. Lead ko customer mein convert karein.</Text>}/>
 </SafeAreaView>
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#f5f7fb',padding:12},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:25,fontWeight:'800'},grid:{gap:7,marginTop:10},empty:{textAlign:'center',marginTop:30,color:'#64748b'}});