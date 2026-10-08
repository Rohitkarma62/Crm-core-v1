import {useFocusEffect} from '@react-navigation/native';
import {Pressable,RefreshControl,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import {colors,spacing,radius,typography} from '../../theme';

function Metric({label,value}){
 return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>;
}
function QuickAction({label,onPress}){
 return <Pressable onPress={onPress} style={({pressed})=>[s.action,pressed&&s.pressed]}><Text style={s.actionPlus}>+</Text><Text style={s.actionText}>{label}</Text></Pressable>;
}

export default function DashboardScreen({navigation}){
 const {stats,recentActivities,salesOverview,leadPipeline,loading,refreshDashboard}=useCRMStore();
 useFocusEffect(React.useCallback(()=>{refreshDashboard()},[refreshDashboard]));
 const pipelineTotal=leadPipeline.reduce((n,x)=>n+Number(x.count||0),0);
 return <ScrollView style={s.safe} refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshDashboard} tintColor={colors.text}/>} contentContainerStyle={s.content}>
   <View style={s.header}>
     <View><Text style={s.eyebrow}>WORKSHOP CRM</Text><Text style={s.title}>Good to see you.</Text><Text style={s.sub}>Your business, at a glance.</Text></View>
     <View style={s.offline}><View style={s.dot}/><Text style={s.offlineText}>Offline</Text></View>
   </View>

   <View style={s.primaryMetric}><Text style={s.primaryLabel}>TOTAL COLLECTION</Text><Text style={s.primaryValue}>₹{Number(stats.collection||0).toLocaleString('en-IN')}</Text><Text style={s.primarySub}>Pending ₹{Number(stats.pending||0).toLocaleString('en-IN')}</Text></View>

   <View style={s.metrics}>
     <Metric label="Sales" value={stats.sales||0}/>
     <Metric label="Customers" value={stats.customers||0}/>
     <Metric label="Leads" value={stats.leads||0}/>
     <Metric label="Revenue" value={'₹'+Number(stats.revenue||0).toLocaleString('en-IN')}/>
   </View>

   <Text style={s.sectionTitle}>Quick actions</Text>
   <View style={s.actions}>
     <QuickAction label="New Lead" onPress={()=>navigation.navigate('Leads')}/>
     <QuickAction label="New Customer" onPress={()=>navigation.navigate('Customers')}/>
     <QuickAction label="New Sale" onPress={()=>navigation.navigate('Sales')}/>
     <QuickAction label="Payment" onPress={()=>navigation.navigate('Sales')}/>
   </View>

   <View style={s.sectionHeader}><Text style={s.sectionTitle}>Lead pipeline</Text><Pressable onPress={()=>navigation.navigate('Leads')}><Text style={s.link}>View all</Text></Pressable></View>
   <View style={s.panel}>
     <Text style={s.pipelineTotal}>{pipelineTotal} active leads</Text>
     <View style={s.pipelineRow}>{leadPipeline.length?leadPipeline.map(x=><View key={x.stage} style={s.pipelineItem}><Text style={s.pipelineCount}>{x.count}</Text><Text style={s.pipelineLabel}>{x.stage}</Text></View>):<Text style={s.muted}>No leads yet</Text>}</View>
   </View>

   <View style={s.sectionHeader}><Text style={s.sectionTitle}>Recent activity</Text><Text style={s.muted}>Latest</Text></View>
   <View style={s.panel}>{recentActivities.length?recentActivities.slice(0,6).map((x,i)=><View key={i} style={s.activity}><View style={s.activityIcon}><Text>₹</Text></View><View style={s.activityMain}><Text style={s.activityTitle}>{x.type||'Sale'}</Text><Text style={s.activityMeta}>{x.date}</Text></View><Text style={s.activityAmount}>₹{Number(x.amount||0).toLocaleString('en-IN')}</Text></View>):<Text style={s.muted}>No activity yet. Your first sale will appear here.</Text>}</View>

   <View style={s.sectionHeader}><Text style={s.sectionTitle}>Sales overview</Text><Pressable onPress={()=>navigation.getParent()?.navigate('Reports')}><Text style={s.link}>Reports</Text></Pressable></View>
   <View style={s.panel}>{salesOverview.length?salesOverview.slice(0,6).map(x=><View key={x.date} style={s.salesRow}><Text style={s.activityMeta}>{x.date}</Text><Text style={s.activityAmount}>₹{Number(x.amount||0).toLocaleString('en-IN')}</Text></View>):<Text style={s.muted}>No sales yet.</Text>}</View>
 </ScrollView>
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.bg},
 content:{padding:spacing.lg,paddingBottom:spacing.xxl},
 header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:spacing.xl},
 eyebrow:{...typography.caption,color:colors.muted,letterSpacing:1.5},
 title:{...typography.display,color:colors.text,marginTop:4},
 sub:{...typography.body,color:colors.muted,marginTop:3},
 offline:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:colors.border,borderRadius:radius.pill,paddingHorizontal:10,paddingVertical:7},
 dot:{width:7,height:7,borderRadius:4,backgroundColor:colors.success,marginRight:6},
 offlineText:{...typography.caption,color:colors.muted},
 primaryMetric:{backgroundColor:colors.text,borderRadius:radius.lg,padding:spacing.xl,marginBottom:spacing.md},
 primaryLabel:{...typography.caption,color:colors.bg,letterSpacing:1},
 primaryValue:{fontSize:32,lineHeight:38,fontWeight:'800',color:colors.bg,marginTop:6},
 primarySub:{...typography.caption,color:'#333333',marginTop:5},
 metrics:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,marginBottom:spacing.xl},
 metric:{width:'48%',minHeight:88,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.md},
 metricLabel:{...typography.caption,color:colors.muted},
 metricValue:{fontSize:20,fontWeight:'800',color:colors.text,marginTop:5},
 sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:spacing.sm,marginTop:spacing.md},
 sectionTitle:{...typography.h2,color:colors.text,marginBottom:spacing.sm},
 link:{...typography.caption,color:colors.text},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,marginBottom:spacing.md},
 action:{width:'48%',minHeight:58,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,paddingHorizontal:spacing.md,flexDirection:'row',alignItems:'center'},
 actionPlus:{fontSize:24,color:colors.text,fontWeight:'300',marginRight:9},
 actionText:{...typography.bodyStrong,color:colors.text},
 panel:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,marginBottom:spacing.md},
 pipelineTotal:{...typography.bodyStrong,color:colors.text,marginBottom:spacing.md},
 pipelineRow:{flexDirection:'row',flexWrap:'wrap',gap:spacing.md},
 pipelineItem:{minWidth:62},
 pipelineCount:{fontSize:20,fontWeight:'800',color:colors.text},
 pipelineLabel:{...typography.caption,color:colors.muted,marginTop:2},
 activity:{flexDirection:'row',alignItems:'center',paddingVertical:11,borderBottomWidth:1,borderBottomColor:colors.border},
 activityIcon:{width:34,height:34,borderRadius:17,backgroundColor:colors.surface2,alignItems:'center',justifyContent:'center'},
 activityMain:{flex:1,marginLeft:10},
 activityTitle:{...typography.bodyStrong,color:colors.text},
 activityMeta:{...typography.caption,color:colors.muted},
 activityAmount:{...typography.bodyStrong,color:colors.text},
 salesRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border},
 muted:{...typography.body,color:colors.muted},
 pressed:{opacity:.65}
});
