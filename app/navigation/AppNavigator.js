import React from 'react';
import {StatusBar} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import LeadsScreen from '../screens/LeadsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SalesScreen from '../screens/SalesScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack=createNativeStackNavigator();

export default function AppNavigator(){
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000"/>
      <Stack.Navigator screenOptions={{
        headerStyle:{backgroundColor:'#000000'},
        headerTintColor:'#ffffff',
        headerTitleStyle:{fontWeight:'800'},
        contentStyle:{backgroundColor:'#000000'}
      }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen}/>
        <Stack.Screen name="Leads" component={LeadsScreen}/>
        <Stack.Screen name="Customers" component={CustomersScreen}/>
        <Stack.Screen name="Sales" component={SalesScreen}/>
        <Stack.Screen name="Payments" component={PaymentsScreen}/>
        <Stack.Screen name="Reports" component={ReportsScreen}/>
        <Stack.Screen name="Settings" component={SettingsScreen}/>
      </Stack.Navigator>
    </>
  );
}
