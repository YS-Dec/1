import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput
} from "react-native";
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { AntDesign } from "@expo/vector-icons"; // Import star icons
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";


const Plan = () => {
  const router = useRouter();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null); // Store selected request
  const [rating, setRating] = useState(0); // User-selected rating
  const [isRatingModalVisible, setRatingModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState(new Date()); // Default: today
  const [showDatePicker, setShowDatePicker] = useState(false);


  // 🔥 Fetch requests from Firestore
  const fetchRequests = async (userId, isRefreshing = false) => {
    if (!userId) return;
  
    try {
      if (!isRefreshing) setLoading(true); // ✅ Use refreshing state correctly
  
      console.log("📤 Fetching requests for user:", userId);
      const q = query(collection(db, "cleaningRequests"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        console.log("❌ No requests found for user:", userId);
      } else {
        console.log("✅ Requests found:", querySnapshot.docs.length);
      }
  
      const userRequests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      console.log("📜 Retrieved requests:", userRequests); // Log retrieved requests
      setRequests(userRequests);
    } catch (error) {
      console.error("❌ Error fetching requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); // ✅ Stop refresh indicator
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("✅ User authenticated:", user.uid);
        setUser(user);
        fetchRequests(user.uid);
      } else {
        console.log("❌ No user authenticated.");
        setUser(null);
        setRequests([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 🔄 **Handle Pull-to-Refresh**
  const onRefresh = async () => {
    if (!user) return;
    console.log("🔄 Refreshing data...");
    setRefreshing(true);
    await fetchRequests(user.uid, true);
  };

  const openRatingModal = (request) => {
    console.log("🟡 Opening rating modal for request:", request);
    setSelectedRequest(request);
    setRating(request.rating || 0);
    setRatingModalVisible(true);
  };

  const openEditModal = (request) => {
    console.log("✏️ Opening edit modal for request:", request);
    setSelectedRequest(request);
    setNewLocation(request.location || ""); // Default to current location
    setNewTime(request.time || ""); // Default to current time
    setNewDate(request.date ? new Date(request.date) : new Date()); // Convert stored date to Date object

    setEditModalVisible(true);
  };

  // ⭐ Function to Submit Rating
  const submitRating = async () => {
    if (!selectedRequest) return;

    try {
      const requestRef = doc(db, "cleaningRequests", selectedRequest.id);
      await updateDoc(requestRef, { rating });

      Alert.alert("Thank You!", "Your rating has been submitted.");
      setRequests(prev => prev.map(req => (req.id === selectedRequest.id ? { ...req, rating } : req)));
      setRatingModalVisible(false);
    } catch (error) {
      console.error("❌ Error updating rating:", error);
      Alert.alert("Error", "Failed to submit rating.");
    }
  };

  // ⭐ Render Star Icons for Rating
  const renderStars = (rating, onPress) => {
    return (
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onPress && setRating(star)}>
            <AntDesign
              name={star <= rating ? "star" : "staro"} // Filled or empty star
              size={30}
              color="#FFD700" // Gold color
              style={{ marginHorizontal: 3 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };


  // 🔥 Edit a request
  const editRequest = async () => {
    if (!selectedRequest) return;

    let formattedDate = newDate;
    if (Platform.OS === "web") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDate)) {
      Alert.alert("Invalid Date", "Please enter a valid date in YYYY-MM-DD format.");
      return;
    }
  } else {
    formattedDate = newDate instanceof Date ? newDate.toISOString().split("T")[0] : "";
  }

    try {
      const requestRef = doc(db, "cleaningRequests", selectedRequest.id);
      await updateDoc(requestRef, { 
        location: newLocation, 
        time: newTime,
        date: newDate.toISOString().split("T")[0] // Convert to YYYY-MM-DD format

      });
  
      Alert.alert("Updated!", "The request has been updated.");

      // Update local state to reflect the change
      setRequests(prev =>
        prev.map(req => (req.id === selectedRequest.id ? { ...req, location: newLocation, time: newTime, date: formattedDate } : req))
      );
  
      setEditModalVisible(false);
    } catch (error) {
      console.error("❌ Error updating request:", error);
      Alert.alert("Error", "Failed to update request.");
    }
  };

  // 🔥 Delete a request
  const deleteRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, "cleaningRequests", requestId));
      Alert.alert("Deleted", "Your request has been removed.");
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("❌ Error deleting request:", error);
      Alert.alert("Error", "Failed to delete request.");
    }
  };

  // **Render Each Request Item**
  const renderRequest = ({ item }) => (
    <View style={styles.requestCard}>
      <Text style={styles.serviceType}>{item.location}</Text>
      <Text style={styles.details}>📅 Date: {item.date}</Text>
      <Text style={styles.details}>🕒 Time: {item.time}</Text>
      <Text style={styles.details}>📝 Notes: {item.additionalNotes || "N/A"}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      {/* Display Rating */}
    {item.status === "Completed" && (
      <View>
        <Text style={styles.ratingLabel}>Rating:</Text>
        {renderStars(item.rating || 0)}
      </View>
    )}

    {/* Rate Task Button (Only for Completed Tasks) */}
    {item.status === "Completed" && (
      <TouchableOpacity style={styles.rateButton} onPress={() => openRatingModal(item)}>
        <Text style={styles.buttonText}>Rate Task</Text>
      </TouchableOpacity>
    )}

    {item.status === "pending" && (
      <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
      <Text style={styles.buttonText}>Edit</Text>
      </TouchableOpacity>
    )}


    {item.status === "pending" && (
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRequest(item.id)}>
      <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
    )}
      
    </View>
  );

  // ✅ Show a loading indicator while fetching data
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Cleaning Requests</Text>
      {requests.length === 0 ? (
        <Text style={styles.noRequests}>No requests found.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          refreshControl={  // ✅ Pull-to-refresh control
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            console.log("📝 Rendering request:", item);
            return renderRequest({ item });
          }}
        />
      )}
      {/* Rating Modal */}
      <Modal visible={isRatingModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate the Cleaning Task</Text>
            {renderStars(rating, true)}

            <TouchableOpacity style={styles.submitButton} onPress={submitRating}>
              <Text style={styles.buttonText}>Submit Rating</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Edit Request</Text>
      
          <TextInput
            style={styles.input}
            value={newLocation}
            onChangeText={setNewLocation}
            placeholder="Enter new location"
          />

          <TextInput
            style={styles.input}
            value={newTime}
            onChangeText={setNewTime}
            placeholder="Enter new time"
          />
          <Text style={styles.label}>Select Date:</Text>

          {/* Use TouchableOpacity for mobile, TextInput for web */}
          {Platform.OS === "web" ? (
            <input
            type="date"
            style={styles.input}
            value={newDate}
            onChange={(event) => setNewDate(event.target.value)} // Update time state
        />
      ) : (
        <>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
            <Text style={styles.dateText}>{newDate.toDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={newDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setNewDate(selectedDate);
              }}
          />
        )}
      </>
      )}

          <TouchableOpacity style={styles.submitButton} onPress={editRequest}>
            <Text style={styles.buttonText}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setEditModalVisible(false)}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    
    </View>
    
  );
};

// **Styles**
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f9f9f9" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  noRequests: { textAlign: "center", fontSize: 16, color: "#555", marginTop: 20 },
  requestCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",  // ✅ New method
    elevation: 3,
  },
  serviceType: { fontSize: 18, fontWeight: "bold", color: "#007BFF" },
  details: { fontSize: 14, color: "#555", marginTop: 5 },
  status: { fontSize: 14, fontWeight: "bold", marginTop: 10, color: "#28A745" },
  editButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 5,
  },
  buttonText: { color: "#fff", fontSize: 16 },
  ratingLabel: { fontSize: 16, fontWeight: "bold", marginTop: 10 },
  rateButton: { backgroundColor: "#FFA500", paddingVertical: 10, borderRadius: 5, alignItems: "center", marginTop: 10 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 10, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  submitButton: { backgroundColor: "#007BFF", padding: 10, borderRadius: 5, marginTop: 15 },
  cancelButton: { color: "#FF3B30", fontSize: 16, marginTop: 10 },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  
  datePickerButton: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
});

export default Plan;