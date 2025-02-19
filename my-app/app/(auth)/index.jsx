import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logo from "@/assets/images/logo.png";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebaseConfig.js";  // Correct import

const LoginPage = () => {
  const router = useRouter();

  // Manage email and password states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state


  // Login handler function
  const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please enter both email and password.");
    return;
  }
  try {
    // Firebase authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("User logged in:", user);
    await AsyncStorage.setItem('email', email);
    await AsyncStorage.setItem('authToken', user.accessToken); // Store Firebase auth token

    Alert.alert("Success", "Login successful!");
    router.replace("(tabs)"); // Navigate to home
  } catch (error) {
    console.error("Login failed:", error);
    Alert.alert("Login Error", error.message);
  }
};

const handleForgotPassword = async () => {
  if (!email) {
    Alert.alert("Error", "Please enter your email address in the above.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    Alert.alert("Success", "Password reset email sent! Check your inbox.");
  } catch (error) {
    console.error("Password Reset Error:", error);
    Alert.alert("Error", error.message);
  }
};
  

const goToSignUp = () => {
  router.push('/signup');
};

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} />
      </View>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="gray"  
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="gray"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.signupButton} onPress={goToSignUp}>
        <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    justifyContent: 'flex-start', 
    flex:1, alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#FFFFFF'
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
  input: { 
    width: '80%', 
    padding: 10, 
    marginVertical: 10, 
    borderWidth: 1, 
    borderRadius: 5 
  },
  button: { 
    backgroundColor: '#007BFF', 
    padding: 15, 
    borderRadius: 5, 
    marginTop: 10 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  logoContainer: { 
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    padding: 10 
  },
  logo: { 
    width: 150, 
    height: 150, 
    resizeMode: 'contain', 
    marginBottom: 10 
  },
  signupButton: {
    marginTop: 20,
  },
  signupText: {
    color: '#007BFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  forgotPasswordButton: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#007BFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  }
});

export default LoginPage;