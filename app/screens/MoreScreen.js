import {Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {colors,spacing,typography,radius} from '../../theme';

const items=[
  {title:'Reports',subtitle:'Revenue, collection and payment insights',screen:'Reports'},
  {title:'Company Settings',subtitle:'Business identity, invoice and signature',screen:'Settings'}
];

export default function MoreScreen({navigation}){
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>More</Text>
      <Text style={s.subtitle}>Business tools and settings</Text>
      {items.map(item=><Pressable key={item.screen} onPress={()=>navigation.getParent()?.navigate(item.screen)} style={({pressed})=>[s.item,pressed&&s.pressed]}>
        <View><Text style={s.itemTitle}>{item.title}</Text><Text style={s.itemSub}>{item.subtitle}</Text></View>
        <Text style={s.arrow}>›</Text>
      </Pressable>)}
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.bg},
 content:{padding:spacing.lg},
 title:{...typography.display,color:colors.text},
 subtitle:{...typography.body,color:colors.muted,marginTop:4,marginBottom:spacing.xl},
 item:{minHeight:76,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,marginBottom:spacing.md,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 itemTitle:{...typography.bodyStrong,color:colors.text},
 itemSub:{...typography.caption,color:colors.muted,marginTop:4},
 arrow:{fontSize:30,color:colors.muted},
 pressed:{opacity:.7}
});