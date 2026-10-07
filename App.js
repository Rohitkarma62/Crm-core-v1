import React,{useEffect,useState} from 'react';
import {View,ActivityIndicator,Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from './app/navigation/AppNavigator';
import {initDatabase} from './app/db/dbSetup';

export default function App(){
 const [ready,setReady]=useState(false);
 const [error,setError]=useState(null);
 useEffect(()=>{initDatabase().then(()=>setReady(true)).catch(e=>setError(e))},[]);
 if(error)return <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:20}}><Text>Database error: {error.message}</Text></View>;
 if(!ready)return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View>;
 return <NavigationContainer><AppNavigator/></NavigationContainer>;
}