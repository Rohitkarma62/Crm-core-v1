import React from 'react';
import {Text,View,StyleSheet} from 'react-native';
import {colors,radius,spacing,typography} from '../theme';

export default function Card({title,subtitle,children}){
 return <View style={styles.card}>
   {!!title&&<Text style={styles.title}>{title}</Text>}
   {!!subtitle&&<Text style={styles.subtitle}>{subtitle}</Text>}
   {children}
 </View>;
}
const styles=StyleSheet.create({
 card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,marginBottom:spacing.md},
 title:{...typography.bodyStrong,color:colors.text},
 value:{fontSize:25,fontWeight:'800',color:colors.text,marginTop:5},
 subtitle:{...typography.caption,color:colors.muted,marginTop:3}
});
