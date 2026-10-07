import React,{useEffect,useState} from 'react';
import {Alert,FlatList,Modal,SafeAreaView,ScrollView,StyleSheet,Text,View,Pressable} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';

export default function SalesScreen({navigation,route}){
 const {customers,loadCustomers,sales,loadSales,createSale}=useCRMStore();
 const [modal,setModal]=useState(false),[customerId,setCustomerId]=useState(null),[amount,setAmount]=useState(''),[busy,setBusy]=useState(false);\n const presetCustomerId=route?.params?.customerId;
 useEffect(()=>{loadCustomers();loadSales()},[]);\n useEffect(()=>{if(presetCustomerId){setCustomerId(Number(presetCustomerId));setModal(true)}},[presetCustomerId]);
 const save=async()=>{if(busy)return;try{setBusy(true);const id=await createSale({customerId,amount});setModal(false);setAmount('');setCustomerId(null);navigation.navigate('Payments',{saleId:id})}catch(e){Alert.alert('Sale error',e.message)}finally{setBusy(false)}};
 return <SafeAreaView style={styles.safe}>
  <View style={styles.header}><Text style={styles.title}>Sales</Text><Button title="+ New Sale" onPress={()=>setModal(true)}/></View>
  <FlatList data={sales} keyExtractor={x=>String(x.id)} renderItem={({item})=><Card title={item.customer_name} subtitle={item.phone}>
    <Text style={styles.line}>Sale: ₹{Number(item.amount).toFixed(2)}</Text>
    <Text style={styles.line}>Paid: ₹{Number(item.paid_amount).toFixed(2)} • Pending: ₹{Number(item.pending_amount).toFixed(2)}</Text>
    <Text style={styles.status}>{item.status} • {item.date}</Text>
    <View style={styles.row}><Button title="Payments" onPress={()=>navigation.navigate('Payments',{saleId:item.id})}/></View>
  </Card>} ListEmptyComponent={<Text style={styles.empty}>No sales yet.</Text>}/>
  <Modal visible={modal} animationType="slide" onRequestClose={()=>setModal(false)}><SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.form}>
   <Text style={styles.title}>New Sale</Text><Text style={styles.label}>Customer</Text>
   {customers.map(c=><Pressable key={c.id} onPress={()=>setCustomerId(c.id)} style={[styles.customer,customerId===c.id&&styles.selected]}><Text style={styles.bold}>{c.name}</Text><Text>{c.phone}</Text></Pressable>)}
   <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Sale amount"/>
   <Button title="Create Sale" loading={busy} onPress={save}/><Button title="Cancel" variant="secondary" onPress={()=>setModal(false)}/>
  </ScrollView></SafeAreaView></Modal>
 </SafeAreaView>
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#ffffff',padding:12},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:25,fontWeight:'800'},line:{marginTop:7},status:{marginTop:7,color:'#555555'},row:{marginTop:8},empty:{textAlign:'center',marginTop:30,color:'#555555'},form:{padding:16},label:{fontWeight:'700',marginBottom:7},customer:{padding:12,borderWidth:1,borderColor:'#111111',borderRadius:10,marginBottom:8},selected:{backgroundColor:'#eeeeee',borderColor:'#111111'},bold:{fontWeight:'700'}});