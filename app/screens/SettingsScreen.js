import React,{useState}from'react';
import {useFocusEffect}from'@react-navigation/native';
import {Alert,Image,SafeAreaView,ScrollView,StyleSheet,Text}from'react-native';
import*as ImagePicker from'expo-image-picker';import*as FileSystem from'expo-file-system';
import{useCRMStore}from'../../store/useCRMStore';import Input from'../../components/Input';import Button from'../../components/Button';
import{colors,spacing,typography}from'../../theme';

export default function SettingsScreen(){
 const{loadCompanySettings,saveCompanySettings}=useCRMStore();
 const[d,setD]=useState({name:'',owner:'',logo_uri:'',signature_uri:'',terms:''});
 useFocusEffect(React.useCallback(()=>{loadCompanySettings().then(x=>x&&setD(x)).catch(()=>{})},[loadCompanySettings]));
 const pick=async field=>{try{const p=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!p.granted){Alert.alert('Permission required','Gallery permission required.');return}const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.85});if(r.canceled)return;const asset=r.assets?.[0];if(!asset?.uri)throw new Error('Selected image could not be read.');const dest=FileSystem.documentDirectory+'company/';await FileSystem.makeDirectoryAsync(dest,{intermediates:true});const ext=(asset.fileName||'image.jpg').split('.').pop();const target=dest+field+'_'+Date.now()+'.'+ext;await FileSystem.copyAsync({from:asset.uri,to:target});setD(x=>({...x,[field]:target}))}catch(e){Alert.alert('Image error',e.message)}};
 const save=async()=>{try{await saveCompanySettings(d);Alert.alert('Saved','Company settings saved offline.')}catch(e){Alert.alert('Save error',e.message)}};
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <Text style={s.eyebrow}>WORKSHOP PROFILE</Text><Text style={s.title}>Company Settings</Text><Text style={s.sub}>These details appear on locally generated invoices.</Text>
  <Input label="Business name" value={d.name} onChangeText={v=>setD({...d,name:v})} placeholder="Welding Workshop"/>
  <Input label="Owner" value={d.owner} onChangeText={v=>setD({...d,owner:v})} placeholder="Owner name"/>
  <Input label="Invoice terms" value={d.terms} onChangeText={v=>setD({...d,terms:v})} multiline placeholder="Payment terms / warranty"/>
  <Text style={s.section}>Brand assets</Text>
  <Button title="Choose logo" variant="secondary" onPress={()=>pick('logo_uri')}/>
  {d.logo_uri&&<Image source={{uri:d.logo_uri}} style={s.image}/>}
  <Button title="Choose signature" variant="secondary" onPress={()=>pick('signature_uri')}/>
  {d.signature_uri&&<Image source={{uri:d.signature_uri}} style={s.image}/>}
  <Button title="Save settings" onPress={save}/>
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},content:{padding:spacing.lg,paddingBottom:spacing.xxl},eyebrow:{...typography.caption,color:colors.muted,letterSpacing:1.5},title:{...typography.display,color:colors.text,marginTop:2},sub:{...typography.body,color:colors.muted,marginTop:4,marginBottom:spacing.xl},section:{...typography.h2,color:colors.text,marginTop:spacing.md,marginBottom:spacing.sm},image:{width:'100%',height:150,resizeMode:'contain',backgroundColor:colors.surface,borderRadius:12,borderWidth:1,borderColor:colors.border,marginVertical:spacing.sm}});