import React from 'react';
import {Pressable,Text,StyleSheet,ActivityIndicator} from 'react-native';

export default function Button({title,onPress,disabled=false,loading=false,variant='primary'}){
 return <Pressable disabled={disabled||loading} onPress={onPress} style={({pressed})=>[styles.base,styles[variant],pressed&&styles.pressed,(disabled||loading)&&styles.disabled]}>
   {loading?<ActivityIndicator color="#fff"/>:<Text style={styles.text}>{title}</Text>}
 </Pressable>;
}
const styles=StyleSheet.create({
 base:{minHeight:48,borderRadius:10,paddingHorizontal:18,alignItems:'center',justifyContent:'center',marginVertical:5},
 primary:{backgroundColor:'#111111'},secondary:{backgroundColor:'#ffffff'},danger:{backgroundColor:'#111111'},
 text:{fontSize:16,fontWeight:'700',color:'#fff'},pressed:{opacity:.8},disabled:{opacity:.5}
});