import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import React, { useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, TextInput, Pressable } from 'react-native'
import { SignOutButton } from '@/app/components/SignOutButton'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';

export default function Page() {
  const { user } = useUser()
  const router = useRouter();
  const [email, onChangeEmail] = React.useState('');
  const [password, onChangePassword] = React.useState('');
  const [passwordVisibility, setPasswordVisibility] = useState(true);
const [rightIcon, setRightIcon] = useState('eye-off');
const [rightIconColor, setRightIconColor] = useState('#0C8A7B');

const handlePasswordVisibility = () => {
  if (rightIcon === 'eye') {
      setRightIcon('eye-off');
      setRightIconColor('#FF0000')
      setPasswordVisibility(!passwordVisibility);
  } else if (rightIcon === 'eye-off') {
      setRightIcon('eye');
      setRightIconColor('#0C8A7B')
      setPasswordVisibility(!passwordVisibility);
  }
};
     
  
  return (
    <View>
      <SignedIn>
        <Text>Hello {user?.emailAddresses[0].emailAddress}</Text>
        <SignOutButton />
      </SignedIn>
      <SignedOut>
        <Text style = {styles.title}> Welcome to Stadium Takeover! </Text>
        <Text style = {styles.boxText}> Email </Text>
        {/* <TextInput
        style={styles.inputBox}
        onChangeText={onChangeEmail}
        value={email}
        placeholder="Enter your email"
        placeholderTextColor='#808080'
        /> */}


        <View style = {styles.inputBox}>
            <TextInput
                style={{height: 40,
                        }}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={onChangeEmail}
                value={email}
                placeholder="Enter your email"
                placeholderTextColor='#808080'
                //verticalAlign='middle'
            />
        </View>

        <Text style = {styles.boxText}> Password </Text>
        <View style = {styles.inputBox}>
            <TextInput
                style={{height: 40,
                        }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={passwordVisibility}
                onChangeText={onChangePassword}
                //paddingVertical = {5}
                //textAlignVertical='center'
                value={password}
                placeholder="Enter your password"
                placeholderTextColor='#808080'
            />
            <Pressable style={styles.icon}
            onPress={handlePasswordVisibility}>
                <Ionicons
                    name={rightIcon}
                    size={18}
                    color='#808080'

                />
            </Pressable>
        </View>



        <TouchableOpacity
        style = {styles.button}
        onPress={() => router.push('/auth/sign-in')}>
        <Text style = {styles.buttonText}>Sign in</Text>
        </TouchableOpacity>
        <Text style = {styles.separatorText}>OR</Text>
        <TouchableOpacity
        style = {styles.button}
        onPress={() => router.push('/auth/sign-in')}>
        <Text style = {styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>

        {/* <Link href="/auth/sign-in">
          <Text>Sign in</Text>
        </Link>
        <Link href="/auth/sign-up">
          <Text>Sign up</Text>
        </Link> */}
      </SignedOut>
    </View>
  )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#00338D',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    separatorText: {
        color: '#808080',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    inputBox: {
        flex: 1,
        //flexDirection: 'row',
        justifyContent: 'center',
        //alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        //height:40,
        borderColor: '#555555',
        marginHorizontal: 15,
        marginVertical: 5,
        marginBottom: 16,
        padding: 10,
        paddingVertical: 20,
    },
    
    boxText: {
        color: '#333',
        paddingHorizontal: 22,
        fontSize: 15,
    },
    icon: {
        verticalAlign: 'middle',
        position: 'absolute',
        right: 5,
    },
});