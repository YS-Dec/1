import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import logo from "@/assets/images/logo.png";

const LoginPage = () => {
  const router = useRouter();

  // Manage email and password states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login handler function
  const handleLogin = async () => {
    try {
      const response = await fetch('http://10.0.0.64:5001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error("Server returned an error");

      const data = await response.json();

      if (data.success) {
        alert('Login successful!');
        router.replace('(tabs)'); // Navigate to the home page
      } else {
        alert('Invalid email or password');
      }
    } catch (error) {
      console.error('Login failed', error);
      alert('Server error, please try again');
    }
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '80%', padding: 10, marginVertical: 10, borderWidth: 1, borderRadius: 5 },
  button: { backgroundColor: '#007BFF', padding: 15, borderRadius: 5, marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  logoContainer: { justifyContent: 'flex-start', alignItems: 'center', padding: 10 },
  logo: { width: 150, height: 150, resizeMode: 'contain', marginBottom: 10 },
});

export default LoginPage;