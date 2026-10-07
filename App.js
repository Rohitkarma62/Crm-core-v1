import React,{useEffect,useState} from 'react';
import {View,ActivityIndicator,Text,StyleSheet,Appearance} from 'react-native';
import {NavigationContainer,DarkTheme} from '@react-navigation/native';
import AppNavigator from './app/navigation/AppNavigator';
import {initDatabase,seedCompanySettings} from './app/db/dbSetup';

Text.defaultProps=Text.defaultProps||{};
Text.defaultProps.style=[{color:'#ffffff'},Text.defaultProps.style];
Appearance.setColorScheme('dark');

export default function App(){
 const [ready,setReady]=useState(false);
 const [error,setError]=useState(null);
 useEffect(()=>{let mounted=true;(async()=>{try{await initDatabase();await seedCompanySettings();if(mounted)setReady(true)}catch(e){if(mounted)setError(e)}})();return()=>{mounted=false}},[]);
 if(error)return <View style={s.center}><Text style={s.error}>Database error</Text><Text>{error.message}</Text></View>;
 if(!ready)return <View style={s.center}><ActivityIndicator color="#ffffff"/><Text style={s.loading}>Preparing offline database...</Text></View>;
 return <NavigationContainer theme={DarkTheme}><AppNavigator/></NavigationContainer>;
}
const s=StyleSheet.create({
 center:{flex:1,alignItems:'center',justifyContent:'center',padding:20,backgroundColor:'#000000'},
 error:{fontSize:18,fontWeight:'800',color:'#ffffff',marginBottom:8},
 loading:{marginTop:10,color:'#dddddd'}
});