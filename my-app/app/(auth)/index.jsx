import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logo from "@/assets/images/logo.png";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;


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

    // Email format validation
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://10.0.0.64:5001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
  
      console.log("Response status:", response.status); // Log response status
      console.log("Response headers:", response.headers); // Log headers
  
      const data = await response.json();
      console.log("Response JSON:", data); // Log response body
  
      if (response.ok) {
        // Store email and authentication token in AsyncStorage
        await AsyncStorage.setItem('email', email);
        if (data.authToken) {
          await AsyncStorage.setItem('authToken', data.authToken);
        }
        alert('Login successful!');
        router.replace('(tabs)'); // Navigate to the home page
      } else {
        alert(data.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Server error, please try again');
    }finally {
      setLoading(false);
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
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
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
});

export default LoginPage;