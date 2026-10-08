import {ActivityIndicator,Pressable,StyleSheet,Text} from 'react-native';
import {colors,radius,spacing,typography} from '../theme';

export default function Button({title,onPress,disabled=false,loading=false,variant='primary'}){
 const danger=variant==='danger';
 const secondary=variant==='secondary';
 return <Pressable disabled={disabled||loading} onPress={onPress} style={({pressed})=>[
   styles.base,
   danger?styles.danger:secondary?styles.secondary:styles.primary,
   pressed&&styles.pressed,
   (disabled||loading)&&styles.disabled
 ]}>
   {loading?<ActivityIndicator color={secondary||danger?colors.text:colors.bg}/>:<Text style={[styles.text,secondary&&styles.secondaryText,danger&&styles.dangerText]}>{title}</Text>}
 </Pressable>;
}
const styles=StyleSheet.create({
 base:{minHeight:48,borderRadius:radius.md,paddingHorizontal:spacing.lg,alignItems:'center',justifyContent:'center',marginVertical:4},
 primary:{backgroundColor:colors.text},
 secondary:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
 danger:{backgroundColor:colors.surface,borderWidth:1,borderColor:'#4A2222'},
 text:{...typography.bodyStrong,color:colors.bg},
 secondaryText:{color:colors.text},
 dangerText:{color:colors.danger},
 pressed:{opacity:.72},
 disabled:{opacity:.45}
});
