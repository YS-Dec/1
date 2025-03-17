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
  TextInput,
  ImageBackground,
} from "react-native";
import bground from "@/assets/images/light-purple-glitter-background-nkx73.png"
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { AntDesign } from "@expo/vector-icons"; // Import star icons
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";


//const ColorList = "#318CE7"; // Applied color
const ColorList = "#BF40BF";

const Plan = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track button state
  const [selectedRequest, setSelectedRequest] = useState(null); // Store selected request
  const [selectedEmail, setSelectedEmail] = useState({}); // Store emails for clicked requests
  const [rating, setRating] = useState(0); // User-selected rating
  const [isRatingModalVisible, setRatingModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [newTime, setNewTime] = useState(new Date()); 
  const [tempTime, setTempTime] = useState(new Date()); 
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);


  const fetchRequests = async (userId, isRefreshing = false) => {
    if (!userId) return;
    try {
      if (!isRefreshing) setLoading(true);
      const q = query(collection(db, "cleaningRequests"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const userRequests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(userRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchRequests(user.uid);
      } else {
        setUser(null);
        setRequests([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);


  const handleRating = async (cleanerId, rating) => {
    if (!cleanerId) {
      console.error("Error: cleanerId is undefined");
      Alert.alert("Error", "Cleaner ID is missing.");
      return;
    }
  
    try {
      const cleanerRef = doc(db, "users", cleanerId); // Reference to the cleaner's document
      const docSnap = await getDoc(cleanerRef);
      if (!docSnap.exists()) {
        console.error("Error: Cleaner document does not exist.");
        Alert.alert("Error", "Cleaner profile not found.");
        return;
      }

      // Fetch existing values with default fallback
      const updatedData = docSnap.data();
      const currentTotalPoints = updatedData.totalPoints || 0;
      const currentTotalRatings = updatedData.totalRatings || 0;

      // Compute new values
      const newTotalPoints = currentTotalPoints + rating;
      const newTotalRatings = currentTotalRatings + 1;
      const newAverage = newTotalRatings > 0 ? newTotalPoints / newTotalRatings : 0;

      // Update all values in a single `updateDoc` call
      await updateDoc(cleanerRef, {
        totalPoints: increment(rating),  
        totalRatings: increment(1),      
        average: newAverage,  // Update the computed average
      });
  
      Alert.alert("Success", "Rating updated for cleaner!");
    } catch (error) {
      console.error("Error updating cleaner's rating:", error.message);
      Alert.alert("Error", "Failed to update rating.");
    }
  };

  const handleRefresh = async () => {
  if (!user) return;

  try {
    setRefreshing(true);
    await fetchRequests(user.uid);
  } catch (error) {
    console.error("Error refreshing requests:", error);
  } finally {
    setRefreshing(false);
  }
};

  const openRatingModal = (request) => {
    console.log("Opening rating modal for request:", request);
    setSelectedRequest(request);
    setRating(request.rating || 0);
    setRatingModalVisible(true);
  };

  const openEditModal = (request) => {
    console.log("Opening edit modal for request:", request);
    setSelectedRequest(request);
    setNewLocation(request.location || ""); // Default to current location
    setNewTime(request.time || new Date()); // Default to current time
    setNewDate(request.date ? new Date(request.date) : new Date()); // Convert stored date to Date object

      // ✅ Convert `request.time` to a Date object
  if (request.time) {
    const timeParts = request.time.match(/(\d+):(\d+) (\w+)/);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const ampm = timeParts[3];

        if (ampm === "PM" && hours !== 12) {
          hours += 12;
        } else if (ampm === "AM" && hours === 12) {
          hours = 0;
        }

        const newDateTime = new Date();
        newDateTime.setHours(hours, minutes, 0);
        setNewTime(newDateTime); // ✅ Ensures `newTime` is a Date object
      }
    } else {
      setNewTime(new Date()); // Default to current time
    }


    setEditModalVisible(true);
  };

  // Function to Submit Rating
  const submitRating = async () => {
    if (!selectedRequest || isSubmitting) return; // Prevent multiple clicks

    setIsSubmitting(true); // Disable button immediately

    try {
      const requestRef = doc(db, "cleaningRequests", selectedRequest.id);
      await updateDoc(requestRef, { rating });

      Alert.alert("Thank You!", "Your rating has been submitted.");
      setRequests(prev => prev.map(req => (req.id === selectedRequest.id ? { ...req, rating } : req)));
      setRatingModalVisible(false);
    } catch (error) {
      console.error("Error updating rating:", error);
      Alert.alert("Error", "Failed to submit rating.");
    }finally {
      setIsSubmitting(false); // Re-enable button after operation (optional)
    }
  };

  // Render Star Icons for Rating
  const renderStars = (rating, onPress) => {
    return (
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onPress && handleRating(selectedRequest.cleanerId, star) && setRating(star)}> 
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

  const fetchCleanerEmail = async (requestId) => {
    try {
      const userRef = doc(db, "cleaningRequests", requestId);
      const requestSnap = await getDoc(userRef);  
      if (requestSnap.exists()) {
        const requestData = requestSnap.data();
        const cleanerId = requestData.cleanerId;

        if (!cleanerId) {
          Alert.alert("No Cleaner Assigned", "This request has not been accepted by a cleaner yet.");
          return;
        }
        // Get cleaner's user document
        const cleanerRef = doc(db, "users", cleanerId);
        const cleanerSnap = await getDoc(cleanerRef);

        if (cleanerSnap.exists()) {
          const cleanerEmail = cleanerSnap.data().email;

          // Toggle email visibility in state
          setSelectedEmail((prev) => ({
            ...prev,
            [requestId]: prev[requestId] ? null : cleanerEmail,
          }));
        }else {
          Alert.alert("Error", "Cleaner information not found.");
        }
      } else {
        Alert.alert("Error", "Request not found.");
      }
    } catch (error) {
      console.error("Error fetching user email:", error);
      setSelectedEmail((prev) => ({ ...prev, [requestId]: "Error fetching email" }));
    }
  };


  // Edit a request
  const editRequest = async () => {
    if (!selectedRequest) return;

    let formattedDate = newDate instanceof Date ? newDate.toISOString().split("T")[0] : "";

    let hours = newTime.getHours() % 12 || 12; 
    let minutes = newTime.getMinutes().toString().padStart(2, "0"); 
    let ampm = newTime.getHours() >= 12 ? "PM" : "AM";
    let formattedTime = `${hours}:${minutes} ${ampm}`; 

    if (Platform.OS === "web") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formattedDate)) {
        Alert.alert("Invalid Date", "Please enter a valid date in YYYY-MM-DD format.");
        return;
      }
    } else {
      formattedDate = newDate instanceof Date ? newDate.toISOString().split("T")[0] : "";
    }

    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (!timeRegex.test(formattedTime)) {
      Alert.alert("Invalid Time", `Invalid format: ${formattedTime}. Please enter time in HH:MM AM/PM format.`);
      return;
    }

    try {
      const requestRef = doc(db, "cleaningRequests", selectedRequest.id);
      await updateDoc(requestRef, { 
        location: newLocation, 
        time: formattedTime,
        date: formattedDate, 
      });
  
      Alert.alert("Updated!", "The request has been updated.");

      // Update local state to reflect the change
      setRequests(prev =>
        prev.map(req => (req.id === selectedRequest.id 
          ? { ...req, location: newLocation, time: formattedTime, date: formattedDate } 
          : req))
      );
  
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error updating request:", error);
      Alert.alert("Error", "Failed to update request.");
    }
  };

  const deleteRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, "cleaningRequests", requestId));
      Alert.alert("Deleted", "Your request has been removed.");
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Error deleting request:", error);
      Alert.alert("Error", "Failed to delete request.");
    }
  };

  const renderRequest = ({ item }) => (
    <View style={[styles.requestCard, { borderColor: ColorList }]}>
      <Text style={[styles.serviceType, { color: ColorList }]}>{item.location}</Text>
      <Text style={styles.details}>📅 Date: {item.date}</Text>
      <Text style={styles.details}>🕒 Time: {item.time}</Text>
      <Text style={styles.details}>📝 Notes: {item.additionalNotes || "N/A"}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

    {/* Button to Show User Email */}
      <TouchableOpacity
        style={styles.showEmailButton}
        onPress={() => fetchCleanerEmail(item.id)}
      >
      <Text style={styles.showEmailText}>
        {selectedEmail[item.id] ? "Hide Email" : "Contact Cleaner"}
      </Text>

      </TouchableOpacity>
    
      {/* Display Email when Clicked */}
      {selectedEmail[item.id] && (
        <Text style={styles.emailText}>📧 {selectedEmail[item.id]}</Text>
      )}
      

      {/* Display Rating */}
      {item.status === "Completed" && (
        <View>
          <Text style={styles.ratingLabel}>Rating:</Text>
          {renderStars(item.rating || 0)}
        </View>
      )}


      {/* Rate Task Button (Only for Completed Tasks) */}
      {item.status === "Completed" && (
        <TouchableOpacity 
        style={[
          styles.rateButton, 
          item.rating ? { backgroundColor: "#ccc" } : {}, // Change color if already rated
          isSubmitting ? { backgroundColor: "#ccc" } : {} // Change color when submitting
        ]}
        onPress={() => !item.rating && !isSubmitting && openRatingModal(item)} // Prevent multiple clicks
        disabled={Boolean(item.rating) || isSubmitting} // Ensure Boolean value
      >
        <Text style={styles.buttonText}>
          {item.rating ? "Rated" : "Rate Task"}
        </Text>
      </TouchableOpacity>
      )}


      {item.status != "Completed" && (
        <TouchableOpacity style={[styles.editButton,{ backgroundColor: ColorList }]} onPress={() => openEditModal(item)}>
        <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
      )}


      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRequest(item.id)}>
      <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
      
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={ColorList} />
      </View>
    );
  }

  return (
    <ImageBackground source={bground} style={styles.background}>
    <View style={styles.container}>
      <Text style={[styles.header, { color: "#000000" }]}>Your Cleaning Requests</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <AntDesign name="reload1" size={24} color="white" />
            <Text style={[styles.buttonText, { color: "white" }]}>Click Here to Refresh </Text>
          </TouchableOpacity>
      {requests.length === 0 ? (
        <Text style={styles.noRequests}>No requests found.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        />
        
      )}
      
      {/* Rating Modal */}
      <Modal visible={isRatingModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate the Cleaning Task</Text>
            {renderStars(rating, true)}

            <TouchableOpacity style={[styles.submitButton, isSubmitting && { backgroundColor: "#ccc" }]} onPress={submitRating} disabled={isSubmitting}>
              <Text style={styles.buttonText}> {isSubmitting ? "Submitting..." : "Submit Rating"}</Text>
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

          {/* Time Picker */}
          <Text style={styles.label}>Select Time:</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}>
            <Text style={styles.dateText}>
              {newTime instanceof Date ? newTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                : "Select Time"}
            </Text>
          </TouchableOpacity>

          {/* Time Picker */}
          {showTimePicker && (
          <Modal transparent animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <DateTimePicker
                  value={tempTime || new Date()} // ✅ Use tempTime instead of newTime
                  mode="time"
                  display="spinner"
                  textColor="black"
                  is24Hour={false}
                  onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setTempTime(selectedTime); // ✅ Temporarily store the selected time
                  }
                  }}
                />

                {/* Confirm Button */}
                <TouchableOpacity onPress={() => {
                  setNewTime(tempTime); // ✅ Only update when confirmed
                  setShowTimePicker(false);
                }} style={styles.confirmButton}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
)}



         
          

          {/* Use TouchableOpacity for mobile, TextInput for web */}
          <Text style={styles.label}>Select Date:</Text>
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
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
  },
  container: { flexGrow: 1, padding: 20, paddingbottom:100, backgroundColor: "#transparent" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  noRequests: { textAlign: "center", fontSize: 16, color: "#555", marginTop: 20 },
  requestCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 2,
    elevation: 3,
  },
  serviceType: { fontSize: 18, fontWeight: "bold" },
  details: { fontSize: 14, color: "#555", marginTop: 5 },
  status: { fontSize: 14, fontWeight: "bold", marginTop: 10, color: "#28A745" },
  editButton: {
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
  refreshButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor:"black",
  },
  showEmailButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: "#007BFF",
    alignItems: "center",
  },
  showEmailText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  emailText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", // Dark overlay
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButton: {
    marginTop: 10,
    backgroundColor: "#2196F3",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 5,
    backgroundColor: "#ccc",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    padding:10,
  },

});

export default Plan;