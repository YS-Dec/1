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
import * as FileSystem from "expo-file-system";  // ✅ Added missing import
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot, updateDoc } from "firebase/firestore"; // ✅ Added updateDoc
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebaseConfig"; // ✅ Ensure correct imports

const Profile = () => {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        return () => unsubscribeFirestore();  // ✅ Properly unsubscribing from Firestore listener
      } else {
        setError("User not logged in.");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();  // ✅ Properly unsubscribing from auth listener
  }, []);

  // 🔥 **Upload Profile Picture to Firebase Storage**
  const uploadProfilePicture = async (uri) => {
    try {
      if (!uri) throw new Error("No image selected");
  
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");
  
      let localUri = uri;
  
      // 🔥 Check if the image is from iCloud (iOS) and download it locally
      if (!uri.startsWith("file://")) {
        console.log("Downloading image from iCloud...");
        const downloadedFile = await FileSystem.downloadAsync(uri, FileSystem.documentDirectory + "tempImage.jpg");
        localUri = downloadedFile.uri;
        console.log("Downloaded to:", localUri);
      }
  
      // 🔥 Convert file to a blob
      const response = await fetch(localUri);
      const blob = await response.blob();
  
      // 🔥 Upload to Firebase Storage
      const filename = `profilePictures/${user.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      const uploadTask = uploadBytesResumable(storageRef, blob);
  
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error("Upload error:", error);
          Alert.alert("Upload Error", "Failed to upload profile picture.");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at", downloadURL);
  
          // 🔥 Update Firestore with new profile picture URL
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, { profilePictureUrl: downloadURL });  // ✅ Fixed missing updateDoc

          // ✅ Update local state to reflect the new profile picture
          setUserInfo(prev => ({ ...prev, profilePictureUrl: downloadURL }));

          Alert.alert("Success", "Profile picture updated!");
        }
      );
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      Alert.alert("Upload Error", "An error occurred while uploading the picture.");
    }
  };

  // 🔥 **Pick Image and Upload**
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow access to photos to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while selecting the image.');
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
      <TouchableOpacity onPress={pickImage}>
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
  signOutButton: { marginTop: 20, backgroundColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  signOutButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: 'red', fontSize: 16, marginBottom: 20 },
});

export default Profile;