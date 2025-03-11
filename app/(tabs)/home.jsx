import React, { useState } from "react";
import { View, ImageBackground, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import bground from "@/assets/images/light-purple-glitter-background-nkx73.png"
import { db, auth } from "../firebaseConfig"; // Import Firestore and Auth
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

const HomePage = () => {
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  // Function to get the user's location and update Firestore
  const fetchLocation = async () => {
    setLoading(true);

    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No user is logged in.");
      setLoading(false);
      return;
    }

    // Request permission
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location access is needed to autofill your address.");
      setLoading(false);
      return;
    }

    try {
      // Get GPS coordinates
      let { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;

      // Convert coordinates to an address
      let addressArray = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (addressArray.length > 0) {
        let address = `${addressArray[0].name}, ${addressArray[0].city}, ${addressArray[0].region}`;
        setLocation(address);

        // Update Firestore with location data
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          location: {
            address,
            latitude,
            longitude,
          },
          updatedAt: serverTimestamp(),
        });

        Alert.alert("Success", "Location updated successfully!");
      } else {
        Alert.alert("Error", "Could not fetch address");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch location");
    }

    setLoading(false);
  };

  return (
    <ImageBackground source={bground} style={styles.background}>
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Magic Broom</Text>
      <Text style={styles.subtitle}>Your ultimate cleaning service platform</Text>

      {/* Address Input */}
      <TextInput
        style={styles.input}
        placeholder="Enter location"
        value={location}
        onChangeText={setLocation}
        editable={false}
      />

      {/* Fetch Location Button */}
      <TouchableOpacity style={styles.button} onPress={fetchLocation} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Fetching..." : "Use My Location"}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#ff9800" />} 
    </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    //backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: "#fff",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#ff9800",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HomePage;