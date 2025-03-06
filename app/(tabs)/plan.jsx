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
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔥 Fetch requests from Firestore
  const fetchRequests = async (userId, isRefreshing = false) => {
    if (!userId) return;

    try {
      if (!isRefreshing) setLoading(true); // ✅ Fix: Use refreshing state correctly

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

      setRequests(userRequests);
    } catch (error) {
      console.error("❌ Error fetching requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); // ✅ Stop refresh indicator
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

  // **Render Each Request Item**
  const renderRequest = ({ item }) => (
    <View style={styles.requestCard}>
      <Text style={styles.serviceType}>{item.location}</Text>
      <Text style={styles.details}>📅 Date: {item.date}</Text>
      <Text style={styles.details}>🕒 Time: {item.time}</Text>
      <Text style={styles.details}>📝 Notes: {item.additionalNotes || "N/A"}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      <TouchableOpacity style={styles.editButton} onPress={() => editRequest(item.id, { status: "Confirmed" })}>
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRequest(item.id)}>
        <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
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
          renderItem={renderRequest}  // ✅ Fix duplicate renderItem function
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
  buttonText: { color: "#fff", fontSize: 16 },
});

export default Plan;