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
} from "react-native";
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Import Firestore

const Plan = () => {
  const router = useRouter();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState({ myRequests: [], acceptedTasks: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔥 Fetch requests from Firestore
  const fetchRequests = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false); // Stop loading if no user
        return;
      }
  
      const querySnapshot = await getDocs(collection(db, "cleaningRequests"));
      const fetchedRequests = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      // ✅ Separate into two categories
      const myRequests = fetchedRequests.filter((req) => req.userId === user.uid);
      const acceptedTasks = fetchedRequests.filter((req) => req.assignedTo === user.uid);
  
      setRequests({ myRequests, acceptedTasks }); // Store both categories
    } catch (error) {
      console.error("Error fetching plan requests:", error);
    } finally {
      setLoading(false); // ✅ Ensure loading stops no matter what
    }
};
  

  // ✅ Listen for user authentication changes
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

  // 🔥 Edit a request
  const editRequest = async (requestId, newData) => {
    try {
      const requestRef = doc(db, "cleaningRequests", requestId);
      await updateDoc(requestRef, newData);
      Alert.alert("Success", "Request updated successfully!");
      setRequests(prev => prev.map(req => (req.id === requestId ? { ...req, ...newData } : req)));
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

  const cancelAcceptedTask = async (requestId) => {
    try {
      const requestRef = doc(db, "cleaningRequests", requestId);
      await updateDoc(requestRef, {
        assignedTo: null,
        status: "pending",
      });

      Alert.alert("Task Canceled", "The task is now available again.");
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error("❌ Error canceling task:", error);
      Alert.alert("Error", "Failed to cancel task.");
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

      {item.userId === user?.uid && (
        <>
          <TouchableOpacity style={styles.editButton} onPress={() => editRequest(item.id, { status: "Confirmed" })}>
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRequest(item.id)}>
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </>
      )}

      {/* cancel task */}
      {item.assignedTo === user?.uid && (
        <TouchableOpacity style={styles.cancelButton} onPress={() => cancelAcceptedTask(item.id)}>
          <Text style={styles.buttonText}>Cancel Task</Text>
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

      {/* 🔹 My Cleaning Requests Section */}
      <Text style={styles.sectionTitle}>My Requests</Text>
      {requests.myRequests.length === 0 ? (
        <Text style={styles.noRequests}>No requests created.</Text>
      ) : (
        <FlatList
          data={requests.myRequests}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={renderRequest} // ✅ Use the same render function
        />
      )}

      {/* 🔹 Accepted Cleaning Tasks Section */}
      <Text style={styles.sectionTitle}>Accepted Tasks</Text>
      {requests.acceptedTasks.length === 0 ? (
        <Text style={styles.noRequests}>No accepted tasks.</Text>
      ) : (
        <FlatList
          data={requests.acceptedTasks}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={renderRequest} // ✅ Use the same render function
        />
      )}
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
  cancelButton: { backgroundColor: "#FFA500", padding: 8, borderRadius: 5, marginTop: 5, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16 },
});

export default Plan;