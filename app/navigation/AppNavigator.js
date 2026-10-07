import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import LeadsScreen from '../screens/LeadsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SalesScreen from '../screens/SalesScreen';
import PaymentsScreen from '../screens/PaymentsScreen';

const Stack=createNativeStackNavigator();

export default function AppNavigator(){
 return <Stack.Navigator>
   <Stack.Screen name="Dashboard" component={DashboardScreen}/>
   <Stack.Screen name="Leads" component={LeadsScreen}/>
   <Stack.Screen name="Customers" component={CustomersScreen}/>
   <Stack.Screen name="Sales" component={SalesScreen}/>
   <Stack.Screen name="Payments" component={PaymentsScreen}/>
 </Stack.Navigator>;
}