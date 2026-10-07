import React,{useEffect,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Alert,FlatList,Modal,SafeAreaView,ScrollView,StyleSheet,Text,View,Pressable} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';

export default function SalesScreen({navigation,route}){
 const {customers,loadCustomers,sales,loadSales,createSale}=useCRMStore();
 const [modal,setModal]=useState(false),[customerId,setCustomerId]=useState(null),[amount,setAmount]=useState(''),[workDescription,setWorkDescription]=useState(''),[discount,setDiscount]=useState(''),[busy,setBusy]=useState(false);
 const presetCustomerId=route?.params?.customerId;
 useFocusEffect(React.useCallback(()=>{loadCustomers().catch(()=>{});loadSales().catch(()=>{})},[loadCustomers,loadSales]));
 useEffect(()=>{if(presetCustomerId){setCustomerId(Number(presetCustomerId));setModal(true)}},[presetCustomerId]);
 const openPayments=id=>navigation.getParent()?.navigate('Payments',{saleId:id});
 const save=async()=>{
  if(busy)return;
  try{
   setBusy(true);
   const id=await createSale({customerId,amount,workDescription,discountAmount:discount});
   setModal(false);setAmount('');setWorkDescription('');setDiscount('');setCustomerId(null);
   openPayments(id);
  }catch(e){Alert.alert('Sale error',e.message)}finally{setBusy(false)}
 };
 return <SafeAreaView style={styles.safe}>
  <View style={styles.header}><View><Text style={styles.eyebrow}>WORKSHOP</Text><Text style={styles.title}>Sales</Text></View><Button title="+ New Sale" onPress={()=>setModal(true)}/></View>
  <FlatList
   data={sales}
   keyExtractor={x=>String(x.id)}
   contentContainerStyle={sales.length?styles.list:styles.emptyList}
   renderItem={({item})=><Card title={item.customer_name} subtitle={item.phone}>
    <Text style={styles.line}>Work: {item.work_description||'Not specified'}</Text>
    <Text style={styles.amount}>₹{Number(item.amount).toFixed(2)}</Text>
    {Number(item.discount_amount||0)>0&&<Text style={styles.discount}>Discount ₹{Number(item.discount_amount).toFixed(2)}</Text>}
    <Text style={styles.line}>Paid ₹{Number(item.paid_amount).toFixed(2)}  •  Pending ₹{Number(item.pending_amount).toFixed(2)}</Text>
    <Text style={styles.status}>{item.status}  •  {item.date}</Text>
    <View style={styles.row}><Button title="Open Payment" onPress={()=>openPayments(item.id)}/></View>
   </Card>}
   ListEmptyComponent={<View><Text style={styles.emptyTitle}>No sales yet</Text><Text style={styles.empty}>Create a sale after selecting a customer.</Text></View>}
  />
  <Modal visible={modal} animationType="slide" onRequestClose={()=>setModal(false)}>
   <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.form}>
    <Text style={styles.eyebrow}>TRANSACTION</Text><Text style={styles.title}>New Sale</Text>
    <Text style={styles.label}>Select customer</Text>
    {customers.length?customers.map(c=><Pressable key={c.id} onPress={()=>setCustomerId(c.id)} style={[styles.customer,customerId===c.id&&styles.selected]}>
      <Text style={styles.bold}>{c.name}</Text><Text style={styles.muted}>{c.phone}</Text>
    </Pressable>):<Text style={styles.empty}>No customers available. Create a customer from Leads first.</Text>}
    <Input label="Total Work Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Example: 25000"/>
    <Input label="Work / Job Description" value={workDescription} onChangeText={setWorkDescription} placeholder="Gate welding + grill repair"/>
    <Input label="Customer Discount" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="Optional discount"/>
    <Button title="Create Sale & Add Payment" loading={busy} onPress={save}/>
    <Button title="Cancel" variant="secondary" onPress={()=>setModal(false)}/>
   </ScrollView></SafeAreaView>
  </Modal>
 </SafeAreaView>
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#000000',padding:16},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.5,color:'#A3A3A3'},title:{fontSize:28,fontWeight:'800',color:'#FFFFFF'},list:{paddingBottom:24},emptyList:{flexGrow:1,justifyContent:'center',alignItems:'center',padding:30},emptyTitle:{fontSize:18,fontWeight:'800',textAlign:'center',color:'#FFFFFF'},empty:{textAlign:'center',marginTop:6,color:'#A3A3A3'},line:{marginTop:8,color:'#FFFFFF'},amount:{fontSize:24,fontWeight:'800',marginTop:10,color:'#FFFFFF'},discount:{marginTop:4,color:'#F5C451'},status:{marginTop:7,color:'#A3A3A3',fontSize:12},row:{marginTop:12},form:{paddingBottom:28},label:{fontWeight:'800',marginBottom:8,color:'#FFFFFF'},customer:{padding:14,borderWidth:1,borderColor:'#2A2A2A',borderRadius:12,marginBottom:8,backgroundColor:'#111111'},selected:{borderColor:'#FFFFFF'},bold:{fontWeight:'800',color:'#FFFFFF'},muted:{color:'#A3A3A3',marginTop:3}
});