import React,{useEffect,useState} from 'react';
import {View,ActivityIndicator,Text,StyleSheet} from 'react-native';
import {NavigationContainer,DarkTheme} from '@react-navigation/native';
import AppNavigator from './app/navigation/AppNavigator';
import {initDatabase} from './app/db/dbSetup';

export default function App(){
 const [ready,setReady]=useState(false);
 const [error,setError]=useState(null);
 useEffect(()=>{initDatabase().then(()=>setReady(true)).catch(e=>setError(e))},[]);
 if(error)return <View style={s.center}><Text style={s.error}>Database error</Text><Text>{error.message}</Text></View>;
 if(!ready)return <View style={s.center}><ActivityIndicator color="#111111"/><Text style={s.loading}>Preparing offline database...</Text></View>;
 return <NavigationContainer theme={DarkTheme}><AppNavigator/></NavigationContainer>;
}
const s=StyleSheet.create({
 center:{flex:1,alignItems:'center',justifyContent:'center',padding:20,backgroundColor:'#000000'},
 error:{fontSize:18,fontWeight:'800',color:'#ffffff',marginBottom:8},
 loading:{marginTop:10,color:'#dddddd'}
});