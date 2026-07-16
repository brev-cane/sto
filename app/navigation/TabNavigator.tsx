import COLORS from '@/app/components/colors';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home as HomeIcon } from 'lucide-react-native';
import Home from '../screens/home';

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
                    borderTopRightRadius: 20,
                    borderTopLeftRadius: 20,
                    backgroundColor: "#fff",
                    overflow: "hidden",
               
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
