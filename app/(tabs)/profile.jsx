import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  Alert,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from "expo-file-system";  
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, getDoc } from "firebase/firestore";  
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebaseConfig"; 

const Profile = () => {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null); // 🔥 Track cleaner application status

  // 🔥 **Subscribe to Real-Time User Data**
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);

        // Real-time listener for user profile
        const unsubscribeFirestore = onSnapshot(userRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            setUserInfo(docSnapshot.data());
          } else {
            setError("User profile not found in database.");
          }
          setLoading(false);
        });

        // 🔥 Check if the user has already applied to be a cleaner
        const applicationRef = doc(db, "cleanerApplications", user.uid);
        getDoc(applicationRef).then((docSnapshot) => {
          if (docSnapshot.exists()) {
            setApplicationStatus(docSnapshot.data().status); 
          }
        });

        return () => unsubscribeFirestore();
      } else {
        setError("User not logged in.");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 🔥 **Apply to Become a Cleaner**
  const applyToBeCleaner = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to apply.");
        return;
      }

      // 🔥 Reference to the cleaner application in Firestore
      const applicationRef = doc(db, "cleanerApplications", user.uid);
      const docSnapshot = await getDoc(applicationRef);

      if (docSnapshot.exists()) {
        Alert.alert("Application Pending", "Your application is already being reviewed.");
        return;
      }

      // 🔥 Create a new application in Firestore
      await setDoc(applicationRef, {
        userId: user.uid,
        email: user.email,
        fullName: userInfo?.fullName || "N/A",
        profilePictureUrl: userInfo?.profilePictureUrl || "",
        status: "pending",
        appliedAt: new Date(),
      });

      setApplicationStatus("pending");
      Alert.alert("Success", "Your application has been submitted for review.");
    } catch (error) {
      console.error("Error applying to be a cleaner:", error);
      Alert.alert("Error", "An error occurred while submitting your application.");
    }
  };

  // 🔥 **Sign Out**
  const handleSignOut = async () => {
    try {
      await AsyncStorage.clear();
      router.replace('/(auth)');
    } catch (err) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // **Loading State**
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  // **Error State**
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile Info</Text>

      {/* Profile Picture */}
      <TouchableOpacity>
        {userInfo?.profilePictureUrl ? (
          <Image source={{ uri: userInfo.profilePictureUrl }} style={styles.profilePicture} />
        ) : (
          <View style={[styles.profilePicture, styles.placeholder]}>
            <Text style={styles.placeholderText}>Add Picture</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.infoLabel}>Name:</Text>
      <Text style={styles.infoValue}>{userInfo?.fullName || "N/A"}</Text>

      <Text style={styles.infoLabel}>Email:</Text>
      <Text style={styles.infoValue}>{userInfo?.email || "N/A"}</Text>

      {/* Cleaner Application Status */}
      {applicationStatus === "pending" ? (
        <Text style={styles.pendingText}>Your cleaner application is under review.</Text>
      ) : (
        <TouchableOpacity style={styles.cleanerButton} onPress={applyToBeCleaner}>
          <Text style={styles.cleanerButtonText}>Apply to be a Cleaner</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

// **Styles**
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  infoLabel: { fontSize: 18, fontWeight: 'bold', color: '#555' },
  infoValue: { fontSize: 18, color: '#333', marginBottom: 10 },
  profilePicture: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#ddd', marginBottom: 20 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 16, color: '#555' },
  pendingText: { fontSize: 16, color: '#FFA500', marginTop: 10, fontWeight: "bold" },
  cleanerButton: { backgroundColor: '#28A745', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, marginTop: 20 },
  cleanerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signOutButton: { marginTop: 20, backgroundColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  signOutButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: 'red', fontSize: 16, marginBottom: 20 },
});

export default Profile;