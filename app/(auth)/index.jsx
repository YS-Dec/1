import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logo from '@/assets/images/logo.png';
import broom from '@/assets/lottie/broom.json';
import * as Haptics from 'expo-haptics';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

/**
 * LoginPage component for user authentication with role-based navigation.
 * @returns {JSX.Element} The rendered login page.
 */
const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Authenticates a user and navigates based on role.
   * @param {string} emailInput - The user's email.
   * @param {string} passwordInput - The user's password.
   * @param {Function} roleCheckCallback - Callback to verify user role.
   * @param {string} navigationPath - Path to navigate to on success.
   */
  const authenticateUser = async (emailInput, passwordInput, roleCheckCallback, navigationPath) => {
    if (!emailInput || !passwordInput) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      const user = userCredential.user;

      await user.reload();
      const refreshedUser = auth.currentUser;

      if (!refreshedUser.emailVerified) {
        Alert.alert('Email Not Verified', 'Please verify your email before logging in.');
        await signOut(auth);
        setLoading(false);
        return;
      }

      await roleCheckCallback(user);

      setTimeout(() => {
        setLoading(false);
        router.replace(navigationPath);
      }, 2000);

      await AsyncStorage.setItem('email', emailInput);
      await AsyncStorage.setItem('authToken', user.accessToken);
    } catch (error) {
      console.error('Authentication failed:', error);
      setLoading(false);
      Alert.alert('Login Error', error.message);
    }
  };

  /**
   * Handles regular user login.
   */
  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    authenticateUser(
      email,
      password,
      async () => {}, // No role check for regular user
      '(tabs)'
    );
  };

  /**
   * Handles cleaner login with role verification.
   */
  const handleCleanerLogin = () => {
    authenticateUser(
      email,
      password,
      async (user) => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'cleaner') {
          throw new Error('This account is not registered as a cleaner.');
        }
        await AsyncStorage.setItem('userRole', 'cleaner');
      },
      '(cleanertabs)/requests'
    );
  };

  /**
   * Handles admin login with privilege verification.
   */
  const handleAdminLogin = () => {
    authenticateUser(
      email,
      password,
      async (user) => {
        const idTokenResult = await user.getIdTokenResult();
        if (!idTokenResult.claims.admin) {
          throw new Error('You do not have admin privileges.');
        }
        await AsyncStorage.setItem('userRole', 'admin');
      },
      '(admintabs)/CleanerManage'
    );
  };

  /**
   * Sends a password reset email to the user.
   */
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password Reset Error:', error);
      Alert.alert('Error', error.message);
    }
  };

  /**
   * Resends email verification to the user.
   */
  const handleResendVerification = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await user.reload();
      const refreshedUser = auth.currentUser;

      if (refreshedUser.emailVerified) {
        Alert.alert('Already Verified', 'Your email is already verified.');
      } else {
        await sendEmailVerification(user);
        Alert.alert('Success', 'Verification email sent.');
        await signOut(auth);
      }
    } catch (error) {
      console.error('Resend Verification Error:', error);
      Alert.alert('Error', 'Failed to resend verification. Please try again later.');
    }
  };

  /**
   * Navigates to the sign-up page.
   */
  const goToSignUp = () => {
    router.push('/signup');
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <LottieView
          source={broom}
          autoPlay
          loop
          style={styles.fullScreenLottie}
        />
      ) : (
        <>
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
            <Animated.Image entering={FadeInRight.delay(300).duration(2000)} source={logo} style={styles.logo} />
          </View>
          <Text style={styles.title}>Login</Text>
          <TextInput
            style={styles.input}
            placeholder='Email'
            placeholderTextColor='gray'
            value={email}
            onChangeText={setEmail}
            keyboardType='email-address'
          />
          <TextInput
            style={styles.input}
            placeholder='Password'
            placeholderTextColor='gray'
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
          <TouchableOpacity style={styles.button} onPress={handleAdminLogin}>
            <Text style={styles.buttonText}>Admin Login</Text>
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
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#5D3FD3',
    position: 'relative',
  },
  fullScreenLottie: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#5D3FD3',
  },
  stars: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  logoContainer: {
    alignItems: 'center',
    padding: 10,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  input: {
    width: '90%',
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#B0A3F5',
    backgroundColor: '#372B7B',
    color: '#FFFFFF',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#6A5ACD',
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
    fontSize: 18,
  },
  signupButton: {
    marginTop: 20,
  },
  signupText: {
    color: '#B0A3F5',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#F8C8DC',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LoginPage;