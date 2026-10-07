import React from 'react';
import {View,Text,StyleSheet} from 'react-native';

export default function Card({title,value,subtitle,children}){
 return <View style={styles.card}>
   {!!title&&<Text style={styles.title}>{title}</Text>}
   {value!==undefined&&<Text style={styles.value}>{value}</Text>}
   {!!subtitle&&<Text style={styles.subtitle}>{subtitle}</Text>}
   {children}
 </View>;
}
const styles=StyleSheet.create({
 card:{backgroundColor:'#111111',borderRadius:14,padding:16,marginBottom:12,elevation:2,shadowColor:'#000',shadowOpacity:.08,shadowRadius:5},
 title:{fontSize:14,fontWeight:'700',color:'#cccccc'},value:{fontSize:25,fontWeight:'800',color:'#ffffff',marginTop:4},subtitle:{fontSize:12,color:'#cccccc',marginTop:3}
});