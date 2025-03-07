import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logo from "@/assets/images/logo.png";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut 
} from "firebase/auth";
import { doc, getDocs, getDoc, updateDoc, collection, query, where } from "firebase/firestore";
import { db, auth, storage } from "../firebaseConfig"; 



const LoginPage = () => {
  const router = useRouter();

  // Manage email and password states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 🔥 **Login Handler with Email Verification Check**
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
  
    try {
      console.log("🚀 Attempting login...");
  
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user) {
        throw new Error("Authentication failed. No user returned.");
      }
  
      console.log("✅ Firebase Auth User:", user.email);
  
      // 🔥 **Ensure Firebase refreshes email verification status**
      await user.reload();
      const refreshedUser = auth.currentUser;
      
      if (!refreshedUser.emailVerified) {
        console.log("❌ Email is not verified!");
        Alert.alert("Email Not Verified", "Please check your email and verify your account before logging in.");
        await signOut(auth);  // Log the user out if not verified
        return;
      }

      console.log("✅ Email verified, proceeding with login...");
      Alert.alert("Success", "Login successful!");
      router.replace("(tabs)");
  
      console.log("✅ User logged in successfully!");
      await AsyncStorage.setItem("email", email);
      await AsyncStorage.setItem("authToken", user.accessToken);
    } catch (error) {
      console.error("❌ Login failed:", error);
      Alert.alert("Login Error", error.message);
    }
  };

  // 🔥 **Handle Forgot Password**
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Success", "Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("❌ Password Reset Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  // 🔥 **Resend Verification Email**
  const handleResendVerification = async (emailInput, passwordInput) => {
    try {  
      if (!email || !password) {
        Alert.alert("Error", "Please enter both email and password.");
        return;
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        throw new Error("Authentication failed. No user returned. Please Signup first.");
      }

      console.log("✅ Firebase Auth User:", user.email);

      await user.reload();
      const refreshedUser = auth.currentUser;
  

      // ✅ **Check if already verified**
      if (refreshedUser.emailVerified) {
        Alert.alert("Already Verified", "Your email is already verified.");
      }
      else if (!refreshedUser.emailVerified) {
        await sendEmailVerification(user);
        Alert.alert("Verification email sended.");
        console.log("✅ Verification email resent to:", user.email);
        await signOut(auth);  // Log the user out if not verified
        return;
      }  
    } catch (error) {
      console.error("❌ Resend Verification Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  // 🔥 **Go to Sign-Up Page**
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

      <TouchableOpacity style={styles.resendVerificationButton} onPress={handleResendVerification}>
        <Text style={styles.resendVerificationText}>Resend Verification Email</Text>
      </TouchableOpacity>
    </View>
  );
};

// 🔥 **Styles**
const styles = StyleSheet.create({
  container: { 
    justifyContent: 'flex-start', 
    flex:1, 
    alignItems: 'center', 
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
  },
  resendVerificationButton: {
    marginTop: 10,
  },
  resendVerificationText: {
    color: '#FF5733',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default LoginPage;