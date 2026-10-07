import React from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Card from '../../components/Card';
import Button from '../../components/Button';
import {colors,spacing,typography} from '../../theme';

export default function ReportsScreen(){
 const{reportSummary={},reportMethods=[],reportMonthly=[],loadReports}=useCRMStore();
 useFocusEffect(React.useCallback(()=>{loadReports().catch(()=>{})},[loadReports]));
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <Text style={s.eyebrow}>BUSINESS INTELLIGENCE</Text><Text style={s.title}>Reports</Text><Text style={s.sub}>A clear view of revenue, collection and pending work.</Text>
  <Button title="Refresh reports" variant="secondary" onPress={()=>loadReports().catch(()=>{})}/>
  <View style={s.grid}>
   <Card title="Revenue"><Text style={s.value}>₹{Number(reportSummary.revenue||0).toFixed(0)}</Text><Text style={s.muted}>Total sales value</Text></Card>
   <Card title="Collection"><Text style={s.value}>₹{Number(reportSummary.collection||0).toFixed(0)}</Text><Text style={s.muted}>Amount received</Text></Card>
   <Card title="Pending"><Text style={s.value}>₹{Number(reportSummary.pending||0).toFixed(0)}</Text><Text style={s.muted}>Still to collect</Text></Card>
   <Card title="Sales"><Text style={s.value}>{reportSummary.sales_count||0}</Text><Text style={s.muted}>Total jobs</Text></Card>
  </View>
  <Card title="Payment methods">{reportMethods.length?reportMethods.map(x=><View key={x.method} style={s.item}><Text style={s.itemTitle}>{x.method}</Text><Text style={s.itemMeta}>{x.count} payments  •  ₹{Number(x.amount).toFixed(0)}</Text></View>):<Text style={s.muted}>No payments recorded yet.</Text>}</Card>
  <Card title="Monthly performance">{reportMonthly.length?reportMonthly.map(x=><View key={x.month} style={s.item}><Text style={s.itemTitle}>{x.month}</Text><Text style={s.itemMeta}>Revenue ₹{Number(x.revenue).toFixed(0)}  •  Collection ₹{Number(x.collection).toFixed(0)}</Text><Text style={s.itemMeta}>Sales {x.sales_count}  •  Pending ₹{Number(x.pending).toFixed(0)}</Text></View>):<Text style={s.muted}>No sales recorded yet.</Text>}</Card>
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},content:{padding:spacing.lg,paddingBottom:spacing.xxl},eyebrow:{...typography.caption,color:colors.muted,letterSpacing:1.5},title:{...typography.display,color:colors.text,marginTop:2},sub:{...typography.body,color:colors.muted,marginTop:4,marginBottom:spacing.lg},grid:{gap:spacing.sm,marginTop:spacing.md},value:{fontSize:24,fontWeight:'800',color:colors.text,marginTop:4},muted:{...typography.caption,color:colors.muted,marginTop:4},item:{paddingVertical:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border},itemTitle:{...typography.bodyStrong,color:colors.text},itemMeta:{...typography.caption,color:colors.muted,marginTop:3}});