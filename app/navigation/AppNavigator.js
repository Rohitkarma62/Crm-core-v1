import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import LeadsScreen from '../screens/LeadsScreen';
import CustomersScreen from '../screens/CustomersScreen';

const Stack=createNativeStackNavigator();

export default function AppNavigator(){
 return <Stack.Navigator>
   <Stack.Screen name="Dashboard" component={DashboardScreen}/>
   <Stack.Screen name="Leads" component={LeadsScreen}/>
   <Stack.Screen name="Customers" component={CustomersScreen}/>
 </Stack.Navigator>;
}