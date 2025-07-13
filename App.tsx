import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import Home from './app/(tabs)/home';
import admin from './app/(tabs)/Admin';
import Login from './app/(tabs)/Login';
import settings from './app/(tabs)/Settings';
import video from './app/(tabs)/Video';
import { FIREBASE_AUTH } from './FirebaseConfig';


const Stack = createNativeStackNavigator();
const InsideStack = createNativeStackNavigator();

function InsideLayout() {
    return (
        <InsideStack.Navigator>
            <InsideStack.Screen name="Home" component={Home} options = {{ headerShown: false }}/>
            <InsideStack.Screen name="Video" component={video} />
            <InsideStack.Screen name="Settings" component={settings} />
            <InsideStack.Screen name="Admin" component={admin} />
        </InsideStack.Navigator>
    );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    onAuthStateChanged(FIREBASE_AUTH, (user) => {
      console.log('user', user);
      setUser(user);
    });
  }, []) 
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Login'>
        {user ? (
          <Stack.Screen name = 'Inside' component = {InsideLayout} options = {{ headerShown: false }} />
        ) : (
          <Stack.Screen name = 'Login' component = {Login} options = {{ headerShown: false }} />
        ) }
      </Stack.Navigator>
    </NavigationContainer>
  );
}

