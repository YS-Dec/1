import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig"; // Import Firestore
import AsyncStorage from "@react-native-async-storage/async-storage";


const submitCleaningRequest = async (location, date, time, additionalNotes, router) => {
  console.log("🟢 Button clicked! Starting request submission..."); // ✅ Debugging log

   // ✅ Get the authenticated user
   const user = auth.currentUser;  // Check logged-in user
 
   if (!user) {
     console.error("❌ User is NOT authenticated!");
     Alert.alert("Error", "You must be logged in to submit a request.");
     return;
   }
 
   console.log("✅ User authenticated:", user.email);


  if (!location || !date || !time) {
    console.log("❌ Missing fields:", { location, date, time });
    Alert.alert("Error", "Please fill out all required fields.");
    return;
  }

  console.log("✅ All fields filled, proceeding with submission...");


  try {
    const userEmail = await AsyncStorage.getItem("email"); // Get user email

    if (!userEmail) {
      console.error("❌ No user email found in AsyncStorage");
      Alert.alert("Error", "No user email found. Please log in again.");
      return;
    }

    console.log("📤 Submitting request...");
    console.log("User Email:", userEmail);
    console.log("Location:", location);
    console.log("Date:", date);
    console.log("Time:", time);
    console.log("Notes:", additionalNotes);

    // ✅ Ensure Firestore is initialized
    if (!db) {
      console.error("❌ Firestore is NOT initialized!");
      Alert.alert("Error", "Firestore is not properly set up.");
      return;
    }

    // ✅ Fix field names (use lowercase for consistency)
    const request = {
      userId: user.uid,
      userEmail: userEmail,
      location: location,  // ✅ Lowercase
      date: date,  // ✅ Lowercase
      time: time,  // ✅ Lowercase
      additionalNotes: additionalNotes || "No additional notes", // ✅ Lowercase
      status: "pending",
      timestamp: new Date(), // ✅ Correct timestamp format
    };

    const docRef = await addDoc(collection(db, "cleaningRequests"), request);
    console.log("✅ Request submitted successfully! Document ID:", docRef.id);

    Alert.alert("Success", "Cleaning request submitted!");
    router.replace("(tabs)");
  } catch (error) {
    console.error("❌ Error submitting request:", error);
    Alert.alert("Error", "Failed to submit request. Please try again.");
  }
};

// Function to get the user's location
  const fetchLocation = async () => {
    setLoading(true);

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
      } else {
        Alert.alert("Error", "Could not fetch address");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch location");
    }

    setLoading(false);
  };


const RequestCleaning = () => {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request a Cleaning Service</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter location"
        value={location}
        onChangeText={setLocation}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter time (HH:MM AM/PM)"
        value={time}
        onChangeText={setTime}
      />

      <TextInput
        style={styles.input}
        placeholder="Additional notes (optional)"
        value={additionalNotes}
        onChangeText={setAdditionalNotes}
        multiline
      />

      <TouchableOpacity
        style={styles.button} onPress={() => submitCleaningRequest(location, date, time, additionalNotes, router)}>
      <Text style={styles.buttonText}>Submit Request</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    padding: 20, 
    backgroundColor: "#fff" 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    textAlign: "center", 
    marginBottom: 20 
  },
  input: { 
    width: "100%", 
    padding: 10, 
    borderWidth: 1, 
    borderRadius: 5, 
    marginBottom: 15 
  },
  button: { 
    backgroundColor: "#007BFF", 
    padding: 15, 
    borderRadius: 5, 
    alignItems: "center" 
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
});

export default RequestCleaning;