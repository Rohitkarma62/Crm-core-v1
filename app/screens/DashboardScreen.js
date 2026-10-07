import React,{useCallback} from 'react';
import {ScrollView,RefreshControl,Text,View,StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useCRMStore} from '../../store/useCRMStore';
import Card from '../../components/Card';

const money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;

export default function DashboardScreen(){
 const {stats,recentActivities,salesOverview,leadPipeline,loading,refreshDashboard,error}=useCRMStore();
 useFocusEffect(useCallback(()=>{refreshDashboard()},[refreshDashboard]));
 return <ScrollView style={styles.container} contentContainerStyle={styles.content}
   refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshDashboard}/>}>
   <Text style={styles.heading}>Dashboard</Text>
   {!!error&&<Text style={styles.error}>{error}</Text>}
   <View style={styles.grid}>
     <Card title="Total Leads" value={stats.leads}/>
     <Card title="Customers" value={stats.customers}/>
     <Card title="Sales" value={stats.sales}/>
     <Card title="Revenue" value={money(stats.revenue)}/>
     <Card title="Collection" value={money(stats.collection)}/>
     <Card title="Pending Payments" value={money(stats.pending)}/>
   </View>
   <Card title="Sales Overview">
     {salesOverview.length?<>{salesOverview.map((x,i)=><View key={i} style={styles.row}><Text>{x.date}</Text><Text>{money(x.amount)}</Text></View>)}</>:<Text style={styles.empty}>No sales yet</Text>}
   </Card>
   <Card title="Lead Pipeline">
     {leadPipeline.length?leadPipeline.map((x,i)=><View key={i} style={styles.row}><Text>{x.stage||'Unassigned'}</Text><Text>{x.count}</Text></View>):<Text style={styles.empty}>No leads yet</Text>}
   </Card>
   <Card title="Recent Activities">
     {recentActivities.length?recentActivities.map((x,i)=><View key={i} style={styles.row}><Text>{x.type}</Text><Text>{money(x.amount)} · {x.date}</Text></View>):<Text style={styles.empty}>No activity yet</Text>}
   </Card>
 </ScrollView>;
}
const styles=StyleSheet.create({
 container:{flex:1,backgroundColor:'#f4f6f8'},content:{padding:16,paddingBottom:32},
 heading:{fontSize:28,fontWeight:'800',marginBottom:14,color:'#17202a'},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
 row:{flexDirection:'row',justifyContent:'space-between;paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#eef1f4'},
 empty:{color:'#7b8794',paddingVertical:8},error:{color:'#c62828',marginBottom:10}
});