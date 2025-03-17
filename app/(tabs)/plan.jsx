import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ImageBackground,
} from "react-native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { 
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { AntDesign } from "@expo/vector-icons"; // Import star icons
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
import backgroundImage from "@/assets/images/light-purple-glitter-background-nkx73.png"

//const COLOR_PRIMARY = "#318CE7"; // Applied color
const COLOR_PRIMARY = "#BF40BF";

/**
 * Plan tab displays cleaning requests for users.
 * Allows request editing, rating, and deletion.
 */
const Plan = () => {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track button state

  // State variables for request management
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState({});
  const [rating, setRating] = useState(0);
  const [isRatingModalVisible, setRatingModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  // State variables for editing requests
  const [newLocation, setNewLocation] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  /**
     * Fetches cleaning requests for the authenticated user
     * @param {string} userId The authenticated user's ID
   */
  const fetchRequests = async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
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

  /**
   * Handles rating a cleaner
   * @param {string} cleanerId  The cleaner's ID
   * @param {number} rating  The rating value (1-5)
   */
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

      // Update all values in Firestore
      await updateDoc(cleanerRef, {
        totalPoints: increment(rating),  
        totalRatings: increment(1),      
        average: newAverage,
      });
  
      Alert.alert("Success", "Rating updated for cleaner!");
    } catch (error) {
      console.error("Error updating cleaner's rating:", error.message);
      Alert.alert("Error", "Failed to update rating.");
    }
  };

  /**
   * Refreshes the request list.
   */
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
  
  /**
   * Opens the rating modal for a specific request
   * @param {Object} request The request object to rate
  */
  const openRatingModal = (request) => {
    console.log("Opening rating modal for request:", request);
    setSelectedRequest(request);
    setRating(request.rating || 0);
    setRatingModalVisible(true);
  };

  /**
   * Opens the edit modal for a specific request
   * @param {Object} request The request object to edit
 */
  const openEditModal = (request) => {
    console.log("Opening edit modal for request:", request);
    setSelectedRequest(request);
    setNewLocation(request.location || "");
    setNewTime(request.time || "");
    setNewDate(request.date ? new Date(request.date) : new Date());

    setEditModalVisible(true);
  };

  /**
   * Submits a rating for the selected request.
  */
  const submitRating = async () => {
    if (!selectedRequest || isSubmitting) return; // Prevent multiple clicks

    setIsSubmitting(true); // Disable button immediately

    try {
      const requestRef = doc(db, "cleaningRequests", selectedRequest.id);
      await updateDoc(requestRef, { rating });

      Alert.alert("Thank You!", "Your rating has been submitted.");
      setRequests(prev =>
        prev.map(req => (req.id === selectedRequest.id ? { ...req, rating } : req))
      );
      setRatingModalVisible(false);
    } catch (error) {
      console.error("Error updating rating:", error);
      Alert.alert("Error", "Failed to submit rating.");
    }finally {
      setIsSubmitting(false); // Re-enable button after operation
    }
  };

  /**
     * Renders star rating icons
     * @param {number} rating The current rating
     * @param {function} onPress Click handler for updating rating
   */
  const renderStars = (rating, onPress) => {
    return (
      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && handleRating(selectedRequest.cleanerId, star) && setRating(star)}
          > 
            <AntDesign
              name={star <= rating ? "star" : "staro"} // Filled or empty star
              size={30}
              color="#FFD700"
              style={{ marginHorizontal: 3 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  /**
   * Fetches the assigned cleaner's email for a specific request
   * @param {string} requestId The ID of the cleaning request
  */
  const fetchCleanerEmail = async (requestId) => {
    try {
      const userRef = doc(db, "cleaningRequests", requestId);
      const requestSnap = await getDoc(userRef);
  
      if (!requestSnap.exists()) {
        Alert.alert("Error", "Request not found.");
        return;
      }
  
      const requestData = requestSnap.data();
      const cleanerId = requestData.cleanerId;
  
      if (!cleanerId) {
        Alert.alert("No Cleaner Assigned", "This request has not been accepted by a cleaner yet.");
        return;
      }
  
      // Get cleaner's user document
      const cleanerRef = doc(db, "users", cleanerId);
      const cleanerSnap = await getDoc(cleanerRef);
  
      if (!cleanerSnap.exists()) {
        Alert.alert("Error", "Cleaner information not found.");
        return;
      }
  
      const cleanerEmail = cleanerSnap.data().email;
  
      setSelectedEmail((prev) => ({
        ...prev,
        [requestId]: prev[requestId] ? null : cleanerEmail,
      }));
  
    } catch (error) {
      console.error("Error fetching user email:", error);
      setSelectedEmail((prev) => ({ ...prev, [requestId]: "Error fetching email" }));
    }
  };


  /**
   * Edit a request with new location, time, and or date
  */
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

    // Validate Time Format
    const timeRegex12u = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i; // 12-hour format (HH:MM AM/PM)
    const timeRegex12l = /^(0?[1-9]|1[0-2]):[0-5][0-9] (am|pm)$/i; // 12-hour format (HH:MM am/pm)

    if (!timeRegex12u.test(newTime) && !timeRegex12l.test(newTime) ) {
      Alert.alert("Invalid Time", "Please enter a valid time in HH:MM AM/PM or am/pm format.");
      return;
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
          prev.map(req =>
            req.id === selectedRequest.id
              ? { ...req, location: newLocation, time: newTime, date: formattedDate }
              : req
            )
        );
    
        setEditModalVisible(false);
      } catch (error) {
        console.error("Error updating request:", error);
        Alert.alert("Error", "Failed to update request.");
      }
  };

  /**
   * Deletes a request from Firestore
   * @param {string} requestId The ID of the request to delete
  */
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

  /**
   * Renders a single cleaning request card
   * @param {object} item Cleaning request data
  */
  const renderRequest = ({ item }) => (
    <View style={[styles.requestCard, { borderColor: COLOR_PRIMARY }]}>
      <Text style={[styles.serviceType, { color: COLOR_PRIMARY }]}>{item.location}</Text>
      <Text style={styles.details}>📅 Date: {item.date}</Text>
      <Text style={styles.details}>🕒 Time: {item.time}</Text>
      <Text style={styles.details}>📝 Notes: {item.additionalNotes || "N/A"}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

    {/* Button to Show/Hide User Email */}
      <TouchableOpacity style={styles.showEmailButton}onPress={() => fetchCleanerEmail(item.id)}>
        <Text style={styles.showEmailText}>
          {selectedEmail[item.id] ? "Hide Email" : "Contact Cleaner"}
        </Text>
      </TouchableOpacity>

      {/* Display Email when Clicked */}
      {selectedEmail[item.id] && <Text style={styles.emailText}>📧 {selectedEmail[item.id]}</Text>}
      
      {/* Display Rating */}
      {item.status === "Completed" && (
        <View>
          <Text style={styles.ratingLabel}>Rating:</Text>
          {renderStars(item.rating || 0)}
        </View>
      )}


      {/* Rate Task Button for Completed Tasks */}
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
          <Text style={styles.buttonText}>{item.rating ? "Rated" : "Rate Task"}</Text>
      </TouchableOpacity>
      )}

      {/* Edit Button */}
      {item.status != "Completed" && (
        <TouchableOpacity
          style={[styles.editButton,{ backgroundColor: COLOR_PRIMARY }]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
      )}

      {/* Delete Button */}
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRequest(item.id)}>
        <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Displays a loading spinner while fetching data
  */
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLOR_PRIMARY} />
      </View>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.container}>
        <Text style={[styles.header, { color: "#000000" }]}>Your Cleaning Requests</Text>
        
        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <AntDesign name="reload1" size={24} color="white" />
          <Text style={[styles.buttonText, { color: "white" }]}>Click Here to Refresh </Text>
        </TouchableOpacity>

        {/* Display Cleaning Requests or Empty State Message */}
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

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && { backgroundColor: "#ccc" }]}
                onPress={submitRating}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}> {isSubmitting ? "Submitting..." : "Submit Rating"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Modal */}
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
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
    backgroundColor: "transparent",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  noRequests: {
    textAlign: "center",
    fontSize: 16,
    color: "#555",
    marginTop: 20,
  },
  requestCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 2,
    elevation: 3,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: "bold",
  },
  details: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
    color: "#28A745",
  },
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  rateButton: {
    backgroundColor: "#FFA500",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  cancelButton: {
    color: "#FF3B30",
    fontSize: 16,
    marginTop: 10,
  },
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
    backgroundColor: "black",
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
});

export default Plan;