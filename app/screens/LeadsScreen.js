import React,{useMemo,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {Alert,FlatList,Modal,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useCRMStore} from '../../store/useCRMStore';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import {colors,spacing,typography} from '../../theme';
import {LEAD_STAGES} from '../core/constants';

const STAGES=LEAD_STAGES;
const empty={name:'',phone:'',details:'',source:'',status:'New',stages:'New',follow_up_date:''};

export default function LeadsScreen({navigation}){
 const {leads,loadLeads,saveLead,deleteLead,moveLead,convertLead}=useCRMStore();
 const [modal,setModal]=useState(false),[form,setForm]=useState(empty),[query,setQuery]=useState('');
 useFocusEffect(React.useCallback(()=>{loadLeads().catch(()=>{})},[loadLeads]));
 const filtered=useMemo(()=>leads.filter(x=>(x.name+' '+x.phone+' '+x.source).toLowerCase().includes(query.toLowerCase())),[leads,query]);
 const edit=(lead)=>{setForm({...lead});setModal(true)};
 const save=async()=>{if(!form.name.trim()||!form.phone.trim()){Alert.alert('Required','Name aur phone required hai.');return}try{await saveLead(form);setForm(empty);setModal(false)}catch(e){Alert.alert('Lead error',e.message)}};
 const remove=(id)=>Alert.alert('Delete lead?','Ye lead permanently delete ho jayegi.',[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:async()=>{try{await deleteLead(id)}catch(e){Alert.alert('Delete error',e.message)}}}]);
 const convert=(id)=>Alert.alert('Convert to customer?','Lead ko customer mein convert karna hai?',[{text:'Cancel'},{text:'Convert',onPress:async()=>{try{const customerId=await convertLead(id);navigation.navigate('Sales',{customerId})}catch(e){Alert.alert('Convert error',e.message)}}}]);
 return <SafeAreaView style={styles.safe}>
  <View style={styles.header}><Text style={styles.title}>Leads</Text><Button title="+ Add Lead" onPress={()=>{setForm(empty);setModal(true)}}/></View>
  <Input placeholder="Search name, phone, source..." value={query} onChangeText={setQuery}/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageBar}>{STAGES.map(s=><View key={s} style={styles.stagePill}><Text style={styles.stageText}>{s}: {leads.filter(x=>x.stages===s).length}</Text></View>)}</ScrollView>
  <FlatList data={filtered} keyExtractor={x=>String(x.id)} renderItem={({item})=>(<Card title={item.name} subtitle={item.phone}>
    <Text style={styles.meta}>{item.source||'No source'} • {item.stages}</Text>
    {!!item.details&&<Text style={styles.details}>{item.details}</Text>}
    {!!item.follow_up_date&&<Text style={styles.meta}>Follow-up: {item.follow_up_date}</Text>}
    <View style={styles.row}>{STAGES.map(s=><Pressable key={s} onPress={async()=>{try{await moveLead(item.id,s)}catch(e){Alert.alert('Stage update error',e.message)}}} style={[styles.mini,s===item.stages&&styles.active]}><Text style={s===item.stages?styles.activeText:styles.miniText}>{s}</Text></Pressable>)}</View>
    <View style={styles.row}><Button title="Edit" variant="secondary" onPress={()=>edit(item)}/><Button title="Customer" onPress={()=>convert(item.id)}/><Button title="Delete" variant="danger" onPress={()=>remove(item.id)}/></View>
  </Card>)} ListEmptyComponent={<Text style={styles.empty}>No leads found.</Text>}/>
  <Modal visible={modal} animationType="slide" onRequestClose={()=>setModal(false)}><SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.form}>
   <Text style={styles.title}>{form.id?'Edit Lead':'New Lead'}</Text>
   <Input label="Name" value={form.name} onChangeText={v=>setForm({...form,name:v})} placeholder="Customer name"/>
   <Input label="Phone" value={form.phone} onChangeText={v=>setForm({...form,phone:v})} keyboardType="phone-pad" placeholder="Mobile number"/>
   <Input label="Source" value={form.source} onChangeText={v=>setForm({...form,source:v})} placeholder="Walk-in, WhatsApp, reference..."/>
   <Input label="Details" value={form.details} onChangeText={v=>setForm({...form,details:v})} placeholder="Requirement / welding work"/>
   <Input label="Follow-up date" value={form.follow_up_date||''} onChangeText={v=>setForm({...form,follow_up_date:v})} placeholder="YYYY-MM-DD"/>
   <Text style={styles.label}>Stage</Text><View style={styles.wrap}>{STAGES.map(s=><Pressable key={s} onPress={()=>setForm({...form,stages:s,status:s})} style={[styles.option,form.stages===s&&styles.selected]}><Text>{s}</Text></Pressable>)}</View>
   <Button title="Save Lead" onPress={save}/><Button title="Cancel" variant="secondary" onPress={()=>setModal(false)}/>
  </ScrollView></SafeAreaView></Modal>
 </SafeAreaView>
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg,padding:spacing.lg},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:spacing.sm},title:{...typography.display,color:colors.text},stageBar:{maxHeight:46,marginBottom:spacing.sm},stagePill:{paddingHorizontal:12,paddingVertical:9,borderRadius:999,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,marginRight:6},stageText:{...typography.caption,color:colors.text},meta:{...typography.caption,color:colors.muted,marginTop:6},details:{...typography.body,color:colors.text,marginTop:8},row:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:10},mini:{borderWidth:1,borderColor:colors.border,paddingHorizontal:9,paddingVertical:7,borderRadius:8,backgroundColor:colors.surface},active:{backgroundColor:colors.text,borderColor:colors.text},miniText:{fontSize:11,color:colors.muted},activeText:{fontSize:11,color:colors.bg,fontWeight:'800'},empty:{textAlign:'center',marginTop:30,color:colors.muted},form:{padding:spacing.lg,paddingBottom:spacing.xxl},label:{...typography.bodyStrong,marginBottom:6,color:colors.text},wrap:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:14},option:{borderWidth:1,borderColor:colors.border,padding:10,borderRadius:8,backgroundColor:colors.surface},selected:{backgroundColor:colors.text,borderColor:colors.text}});