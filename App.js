import React,{useEffect,useState} from 'react';
import {View,ActivityIndicator,Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {initDatabase} from './app/db/dbSetup';

const Stack=createNativeStackNavigator();

function Home(){
  return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
    <Text>Welding Workshop CRM</Text>
    <Text>Offline-first foundation ready.</Text>
  </View>;
}

export default function App(){
  const [ready,setReady]=useState(false);
  useEffect(()=>{initDatabase().then(()=>setReady(true)).catch(console.error)},[]);
  if(!ready) return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator/></View>;
  return <NavigationContainer><Stack.Navigator><Stack.Screen name="Home" component={Home}/></Stack.Navigator></NavigationContainer>;
}