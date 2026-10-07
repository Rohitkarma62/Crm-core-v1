import React from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {ScrollView,RefreshControl,StyleSheet,Text,View,Pressable} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Card from '../../components/Card';

export default function DashboardScreen({navigation}){
 const {stats,recentActivities,salesOverview,leadPipeline,loading,error,refreshDashboard}=useCRMStore();
 useFocusEffect(React.useCallback(()=>{refreshDashboard()},[refreshDashboard]));
 return <ScrollView style={styles.safe} refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshDashboard}/>} contentContainerStyle={styles.content}>
  <Text style={styles.title}>Workshop CRM</Text><Text style={styles.sub}>Offline-first dashboard</Text>
  {error&&<Text style={styles.error}>{error}</Text>}
  <View style={styles.grid}>{[['Leads',stats.leads],['Customers',stats.customers],['Sales',stats.sales],['Revenue','₹'+Number(stats.revenue||0).toFixed(0)],['Collection','₹'+Number(stats.collection||0).toFixed(0)],['Pending','₹'+Number(stats.pending||0).toFixed(0)]].map(([t,v])=><Card key={t} title={t} value={v}/>)}</View>
  <Pressable onPress={()=>navigation.navigate('Leads')}><Card title="Lead Pipeline"><Text>{leadPipeline.map(x=>x.stage+': '+x.count).join('  •  ')||'No leads yet'}</Text></Card></Pressable>
  <Pressable onPress={()=>navigation.navigate('Customers')}><Card title="Customers"><Text>Open customer list →</Text></Card></Pressable>
  <Pressable onPress={()=>navigation.navigate('Sales')}><Card title="Sales & Payments"><Text>Open sales and payment workflow →</Text></Card></Pressable><Pressable onPress={()=>navigation.navigate('Reports')}><Card title="Reports"><Text>Open business reports →</Text></Card></Pressable><Pressable onPress={()=>navigation.navigate('Settings')}><Card title="Company Settings"><Text>Manage logo, signature and invoice terms →</Text></Card></Pressable>
  <Card title="Sales Overview">{salesOverview.length?salesOverview.map(x=><Text key={x.date} style={styles.line}>{x.date}: ₹{Number(x.amount).toFixed(0)}</Text>):<Text>No sales yet.</Text>}</Card>
  <Card title="Recent Activities">{recentActivities.length?recentActivities.map((x,i)=><Text key={i} style={styles.line}>{x.date} • {x.type} • ₹{Number(x.amount).toFixed(0)}</Text>):<Text>No activity yet.</Text>}</Card>
 </ScrollView>
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#ffffff'},content:{padding:12},title:{fontSize:28,fontWeight:'800'},sub:{color:'#555555',marginBottom:12},grid:{gap:0},error:{color:'#111111',marginBottom:8},line:{marginTop:7,color:'#222222'}});