import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Home from '../screens/home';
import ParkingScreen from '../screens/Parking';
import { Home as HomeIcon, Car, WholeWordIcon, Globe, Globe2 } from 'lucide-react-native';
import COLORS from '@/app/components/colors';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    paddingBottom: 5,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    marginBottom: 5,
                }
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={Home}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <HomeIcon color={color} size={size} />
                    ),
                }}
            />
            {/* <Tab.Screen
                name="ParkingTab"
                component={ParkingScreen}
                options={{
                    tabBarLabel: 'Explore',
                    tabBarIcon: ({ color, size }) => (
                        <Globe color={color} size={size} />
                    ),
                }}
            /> */}
        </Tab.Navigator>
    );
};

export default TabNavigator;
