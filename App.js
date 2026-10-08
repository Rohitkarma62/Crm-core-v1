import React,{useEffect,useRef,useState} from 'react';
import {View,ActivityIndicator,Text,StyleSheet,Appearance,Animated,Easing} from 'react-native';
import {NavigationContainer,DarkTheme} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './app/navigation/AppNavigator';
import {initDatabase,seedCompanySettings} from './app/db/dbSetup';

Text.defaultProps=Text.defaultProps||{};
Text.defaultProps.style=[{color:'#ffffff'},Text.defaultProps.style];
Appearance.setColorScheme('dark');

export default function App(){
 const [ready,setReady]=useState(false);
 const [error,setError]=useState(null);
 const scale=useRef(new Animated.Value(0.72)).current;
 const opacity=useRef(new Animated.Value(0)).current;

 useEffect(()=>{
  const intro=Animated.parallel([
   Animated.timing(scale,{toValue:1,duration:650,easing:Easing.out(Easing.back(1.4)),useNativeDriver:true}),
   Animated.timing(opacity,{toValue:1,duration:450,useNativeDriver:true})
  ]);
  intro.start();
  let mounted=true;
  (async()=>{
   try{
    await Promise.all([
     initDatabase().then(seedCompanySettings),
     new Promise(resolve=>setTimeout(resolve,1200))
    ]);
    if(mounted)setReady(true);
   }catch(e){
    if(mounted)setError(e);
   }
  })();
  return()=>{mounted=false;intro.stop()};
 },[opacity,scale]);

 if(error)return <SafeAreaProvider><View style={s.center}><Text style={s.error}>Database error</Text><Text>{error.message}</Text></View></SafeAreaProvider>;
 if(!ready)return <SafeAreaProvider><View style={s.center}>
  <Animated.View style={[s.logo, {opacity,transform:[{scale}]}]}>
   <Text style={s.logoText}>VF</Text>
  </Animated.View>
  <Text style={s.brand}>Vishwakarma Fabrication</Text>
  <ActivityIndicator color="#ffffff" style={s.spinner}/>
  <Text style={s.loading}>Preparing offline database...</Text>
 </View></SafeAreaProvider>;
 return <SafeAreaProvider><NavigationContainer theme={DarkTheme}><AppNavigator/></NavigationContainer></SafeAreaProvider>;
}
const s=StyleSheet.create({
 center:{flex:1,alignItems:'center',justifyContent:'center',padding:20,backgroundColor:'#000000'},
 logo:{width:118,height:118,borderRadius:28,borderWidth:2,borderColor:'#ffffff',alignItems:'center',justifyContent:'center'},
 logoText:{fontSize:48,fontWeight:'900',letterSpacing:2,color:'#ffffff'},
 brand:{fontSize:22,fontWeight:'800',color:'#ffffff',marginTop:24,textAlign:'center'},
 spinner:{marginTop:28},
 error:{fontSize:18,fontWeight:'800',color:'#ffffff',marginBottom:8},
 loading:{marginTop:10,color:'#dddddd'}
});