import React from 'react';
import {TextInput,Text,View,StyleSheet} from 'react-native';

export default function Input({label,error,...props}){
 return <View style={styles.wrap}>
   {!!label&&<Text style={styles.label}>{label}</Text>}
   <TextInput {...props} style={[styles.input,error&&styles.error]} placeholderTextColor="#666666"/>
   {!!error&&<Text style={styles.errorText}>{error}</Text>}
 </View>;
}
const styles=StyleSheet.create({
 wrap:{marginBottom:12},label:{fontSize:14,fontWeight:'700',marginBottom:6,color:'#111111'},
 input:{minHeight:48,borderWidth:1,borderColor:'#111111',borderRadius:10,paddingHorizontal:14,fontSize:16,color:'#111111',backgroundColor:'#ffffff'},
 error:{borderColor:'#111111'},errorText:{color:'#111111',fontSize:12,marginTop:4}
});