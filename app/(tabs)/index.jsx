import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import GOOGLE_KEY from "../googleConfig";
import * as Location from "expo-location";
import axios from "axios";
import Feather from "react-native-vector-icons/Feather";

// Web Date Picker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const RequestCleaning = () => {
  const router = useRouter();
  const locationRef = useRef(null);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ----- CLEAR ALL FIELDS -----
  const clearForm = () => {
    setLocation("");
    setDate(new Date());
    setTime(new Date());
    setAdditionalNotes("");
    locationRef.current?.setAddressText("");
  };

  // ----- GET CURRENT LOCATION -----
  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showError("Location permission is required. Please grant permission.");
        return;
      }
      let userLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = userLocation.coords;

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY.GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.status === "OK") {
        const address = response.data.results[0].formatted_address;
        setLocation(address);
        locationRef.current?.setAddressText(address);
      } else {
        showError("Unable to fetch address from coordinates.");
      }
    } catch (error) {
      console.error("Failed to get location:", error);
      showError("Failed to get current location. Please try again.");
    }
  };

  // ----- SHOW ERROR POPUP -----
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorPopup(true);
  };

  // ----- CLOSE ERROR POPUP -----
  const closeErrorPopup = () => {
    setShowErrorPopup(false);
  };

  // ----- SUBMIT CLEANING REQUEST -----
  const submitCleaningRequest = async () => {
    const user = auth.currentUser;

    if (!user) {
      showError("You must be logged in to submit a request.");
      return;
    }

    if (!location || !date || !time) {
      showError("Please fill out all required fields.");
      return;
    }

    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(time.getHours());
    selectedDateTime.setMinutes(time.getMinutes());

    if (selectedDateTime <= new Date()) {
      showError("Invalid time: You cannot select a past date or time.");
      return;
    }

    let userEmail;
    try {
      userEmail = await AsyncStorage.getItem("email");
      if (!userEmail) {
        showError("No user email found. Please log in again.");
        return;
      }
    } catch (err) {
      showError("Error accessing user email. Please log in again.");
      return;
    }

    try {
      const request = {
        userId: user.uid,
        userEmail,
        location,
        date: date.toISOString().split("T")[0],
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
        additionalNotes: additionalNotes || "No additional notes",
        status: "pending",
        timestamp: new Date(),
      };

      await addDoc(collection(db, "cleaningRequests"), request);

      setShowSuccessPopup(true);
    } catch (error) {
      console.error("Failed to submit request:", error);
      showError("Failed to submit request. Please try again.");
    }
  };

  // ----- CLOSE SUCCESS POPUP -----
  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    clearForm();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Request a Cleaning Service</Text>

      {/* Location Input */}
      <GooglePlacesAutocomplete
        ref={locationRef}
        placeholder="Enter location"
        fetchDetails={true}
        enablePoweredByContainer={false}
        onPress={(data) => setLocation(data.description)}
        query={{ key: GOOGLE_KEY.GOOGLE_MAPS_API_KEY, language: "en" }}
        styles={{ textInput: styles.input }}
      />

      {/* Date Picker */}
      {Platform.OS === "web" ? (
        <DatePicker selected={date} onChange={(newDate) => setDate(newDate)} minDate={new Date()} />
      ) : (
        <TouchableOpacity>
          <Text>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
      )}

      {/* Time Picker */}
      <TextInput style={styles.input} value={time.toLocaleTimeString()} editable={false} />

      {/* Additional Notes */}
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Additional notes (optional)"
        value={additionalNotes}
        onChangeText={setAdditionalNotes}
        multiline
      />

      {/* Submit Button */}
      <TouchableOpacity style={styles.button} onPress={submitCleaningRequest}>
        <Text style={styles.buttonText}>Submit Request</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: { padding: 14, borderWidth: 1, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: "#007BFF", padding: 15, borderRadius: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default RequestCleaning;