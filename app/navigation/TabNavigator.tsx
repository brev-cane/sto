import { useTheme } from "@/theme";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home as HomeIcon } from "lucide-react-native";
import Home from "../screens/home";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { colors, typography } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
          borderTopRightRadius: 20,
          borderTopLeftRadius: 20,
          backgroundColor: colors.tabBarBackground,
          overflow: "hidden",
          boxShadow: "0px -2px 4px rgba(0, 0, 0, 0.1)",
        },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          marginBottom: 5,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={Home}
        options={{
          tabBarLabel: "Home",
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
