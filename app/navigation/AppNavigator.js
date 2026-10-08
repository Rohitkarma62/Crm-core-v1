import {StatusBar,Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {colors} from '../../theme';
import DashboardScreen from '../screens/DashboardScreen';
import LeadsScreen from '../screens/LeadsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SalesScreen from '../screens/SalesScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MoreScreen from '../screens/MoreScreen';

const Tabs=createBottomTabNavigator();
const Stack=createNativeStackNavigator();
const icons={Home:'⌂',Leads:'◉',Customers:'○',Sales:'₹',More:'⋯'};

function MainTabs(){
  return <Tabs.Navigator screenOptions={({route})=>({
    headerShown:false,
    tabBarStyle:{backgroundColor:colors.bg,borderTopColor:colors.border,height:66,paddingTop:6,paddingBottom:7},
    tabBarActiveTintColor:colors.text,
    tabBarInactiveTintColor:colors.soft,
    tabBarLabelStyle:{fontSize:10,fontWeight:'700'},
    tabBarIcon:({color})=><Text style={{fontSize:20,color}}>{icons[route.name]}</Text>
  })}>
    <Tabs.Screen name="Home" component={DashboardScreen}/>
    <Tabs.Screen name="Leads" component={LeadsScreen}/>
    <Tabs.Screen name="Customers" component={CustomersScreen}/>
    <Tabs.Screen name="Sales" component={SalesScreen}/>
    <Tabs.Screen name="More" component={MoreScreen}/>
  </Tabs.Navigator>;
}

export default function AppNavigator(){
  return <>
    <StatusBar barStyle="light-content" backgroundColor={colors.bg}/>
    <Stack.Navigator screenOptions={{
      headerStyle:{backgroundColor:colors.bg},
      headerTintColor:colors.text,
      headerTitleStyle:{fontWeight:'800'},
      contentStyle:{backgroundColor:colors.bg}
    }}>
      <Stack.Screen name="Main" component={MainTabs} options={{headerShown:false}}/>
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{title:'Payment'}}/>
      <Stack.Screen name="Reports" component={ReportsScreen}/>
      <Stack.Screen name="Settings" component={SettingsScreen}/>
    </Stack.Navigator>
  </>;
}
