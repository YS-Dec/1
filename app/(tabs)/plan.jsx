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
  ImageBackground,
} from "react-native";
import bground from "@/assets/images/light-purple-glitter-background-nkx73.png"
import { useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Import Firestore

//const ColorList = "#318CE7"; // Applied color
const ColorList = "#BF40BF";

const Plan = () => {
  const router = useRouter();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchRequests(user.uid, true);
  };

  const editRequest = async (requestId, newData) => {
    try {
      const requestRef = doc(db, "cleaningRequests", requestId);
      await updateDoc(requestRef, newData);
      Alert.alert("Success", "Request updated successfully!");
      setRequests(prev => prev.map(req => (req.id === requestId ? { ...req, ...newData } : req)));
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
      <View style={styles.rowContainer}>
      <Text style={styles.details}>📅 Date: {item.date}</Text>
      {/*<Text style={styles.details}>🕒 Time: {item.time}</Text>*/}
        <Text style={styles.timeText}>{item.time}</Text>
      </View>
      <Text style={styles.details}>📝 Notes: {item.additionalNotes || "N/A"}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      <TouchableOpacity style={[styles.editButton, { backgroundColor: ColorList }]} onPress={() => editRequest(item.id, { status: "Confirmed" })}>
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>

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
      {requests.length === 0 ? (
        <Text style={styles.noRequests}>No requests found.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={renderRequest}
        />
      )}
    </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
  },
  container: { flex: 1, padding: 20, backgroundColor: "#transparent" },
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
  serviceType: { 
    fontSize: 18, 
    fontWeight: "bold", 
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
  },
  details: { 
    fontSize: 14, 
    color: "#000", 
    marginTop: 5 
  },
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
});

export default Plan;