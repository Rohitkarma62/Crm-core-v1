import React from 'react';
import {TextInput,Text,View,StyleSheet} from 'react-native';
import {colors,radius,spacing,typography} from '../theme';

export default function Input({label,error,...props}){
 return <View style={styles.wrap}>
   {!!label&&<Text style={styles.label}>{label}</Text>}
   <TextInput {...props} style={[styles.input,error&&styles.error]} placeholderTextColor={colors.soft}/>
   {!!error&&<Text style={styles.errorText}>{error}</Text>}
 </View>;
}
const styles=StyleSheet.create({
 wrap:{marginBottom:spacing.md},
 label:{...typography.caption,color:colors.muted,marginBottom:6},
 input:{minHeight:50,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:spacing.md,fontSize:15,color:colors.text,backgroundColor:colors.surface},
 error:{borderColor:colors.danger},
 errorText:{color:colors.danger,fontSize:12,marginTop:4}
});
