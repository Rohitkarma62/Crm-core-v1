import React from 'react';
import {Pressable,Text,StyleSheet,ActivityIndicator} from 'react-native';

export default function Button({title,onPress,disabled=false,loading=false,variant='primary'}){
 const secondary=variant==='secondary';
 return <Pressable disabled={disabled||loading} onPress={onPress} style={({pressed})=>[styles.base,styles[variant],pressed&&styles.pressed,(disabled||loading)&&styles.disabled]}>
   {loading?<ActivityIndicator color={secondary?'#ffffff':'#000000'}/>:<Text style={[styles.text,secondary&&styles.secondaryText]}>{title}</Text>}
 </Pressable>;
}
const styles=StyleSheet.create({
 base:{minHeight:48,borderRadius:10,paddingHorizontal:18,alignItems:'center',justifyContent:'center',marginVertical:5},
 primary:{backgroundColor:'#ffffff'},
 secondary:{backgroundColor:'#000000',borderWidth:1,borderColor:'#ffffff'},
 danger:{backgroundColor:'#ffffff'},
 text:{fontSize:16,fontWeight:'700',color:'#000000'},
 secondaryText:{color:'#ffffff'},
 pressed:{opacity:.8},
 disabled:{opacity:.5}
});