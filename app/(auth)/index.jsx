import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logo from "@/assets/images/logo.png";
import * as Haptics from "expo-haptics";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import Animated,{FadeIn, FadeInLeft, FadeInRight, FadeOut } from 'react-native-reanimated';
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
      
      router.replace("(tabs)");
      
      Alert.alert("Success", "Login successful!");
  
      console.log("✅ User logged in successfully!");
      await AsyncStorage.setItem("email", email);
      await AsyncStorage.setItem("authToken", user.accessToken);
    } catch (error) {
      console.error("❌ Login failed:", error);
      Alert.alert("Login Error", error.message);
    }
  };

  const handleCleanerLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
  
    try {
      console.log("🚀 Attempting Cleaner login...");
  
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user) {
        throw new Error("Authentication failed. No user returned.");
      }
  
      console.log("✅ Firebase Auth Cleaner:", user.email);
  
      // 🔥 Refresh user data to check email verification
      await user.reload();
      const refreshedUser = auth.currentUser;
  
      if (!refreshedUser.emailVerified) {
        console.log("❌ Email is not verified!");
        Alert.alert("Email Not Verified", "Please check your email and verify your account before logging in.");
        await signOut(auth);
        return;
      }
  
      // ✅ **Fetch User Role from Firestore**
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        throw new Error("User data not found in database.");
      }
  
      const userData = userDoc.data();
      const userRole = userData.role; // "cleaner" or "user"
  
      console.log("✅ User Role:", userRole);
  
      // ✅ **Redirect Based on Role**
      if (userRole === "cleaner") {
        console.log("Replacing to cleaner tab")
        router.push("(cleanertabs)/requests");
      } else {
        Alert.alert("Error", "This account is not registered as a cleaner.");
        await signOut(auth);
        return;
      }
  
      console.log("✅ Cleaner logged in successfully!");
      await AsyncStorage.setItem("email", email);
      await AsyncStorage.setItem("authToken", user.accessToken);
      await AsyncStorage.setItem("userRole", userRole);
    } catch (error) {
      console.error("❌ Cleaner Login failed:", error);
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
      Alert.alert("Error, Please try again later", error.message);
    }
  };

  // 🔥 **Go to Sign-Up Page**
  const goToSignUp = () => {
    router.push('/signup');
  };

  return (

    <View style={styles.container}>
      <Animated.View style={styles.stars}>
        {Array.from({ length: 50 }).map((_, index) => (
          <Animated.View 
            key={index} 
            style={{
              position: 'absolute',
              top: Math.random() * 800,
              left: Math.random() * 400,
              width: 2,
              height: 2,
              backgroundColor: 'white',
              borderRadius: 50,
              opacity: Math.random() * 0.8,
            }}
          />
        ))}
      </Animated.View>
      <View style={styles.logoContainer}>
        {/*<Image source={logo} style={styles.logo} />*/}
        <Animated.Image entering={FadeInRight.delay(300).duration(2000)} source={logo} style={styles.logo} />
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
      <TouchableOpacity style={styles.button} onPress={handleCleanerLogin}>
        <Text style={styles.buttonText}>Login as Cleaner</Text>
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
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#5D3FD3', // Rich dark purple background
    position: 'relative'
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFFFFF', // Brighter white text
    marginBottom: 20 
  },
  input: { 
    width: '90%', 
    padding: 12, 
    marginVertical: 10, 
    borderWidth: 1, 
    borderRadius: 8,
    borderColor: '#B0A3F5', // Light purple border
    backgroundColor: '#372B7B', // Lighter purple input background
    color: '#FFFFFF', // White text inside input
    fontSize: 16
  },
  button: { 
    backgroundColor: '#6A5ACD', // Soft purple-blue button
    padding: 15, 
    borderRadius: 8, 
    marginTop: 15,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#E94560',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 18 
  },
  logoContainer: { 
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
    color: '#B0A3F5',  // Lighter purple for readability
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: 'underline',
  },
  forgotPasswordButton: {
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#B0A3F5',
    fontWeight: '600',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  resendVerificationButton: {
    marginTop: 10,
  },
  resendVerificationText: {
    color: '#F8C8DC', // Light pink for contrast
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: 'underline',
  },
  // Starry Background Effect
  stars: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  }
});

export default LoginPage;