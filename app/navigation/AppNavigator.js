import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';

const Stack=createNativeStackNavigator();

export default function AppNavigator(){
  return <Stack.Navigator><Stack.Screen name="Home" component={HomeScreen}/></Stack.Navigator>;
}