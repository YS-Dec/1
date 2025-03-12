import React, { useEffect, useState } from "react";
import { 
  View, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity 
} from "react-native";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth"; // Import Firebase Auth
import { db } from "../firebaseConfig"; // Ensure correct Firebase import
import { useNavigation } from "@react-navigation/native"; // Import navigation hook

const AdminCleanerApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const navigation = useNavigation(); // Get navigation instance

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "cleanerApplications"));
        const apps = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setApplications(apps);
      } catch (error) {
        console.error("Error fetching cleaner applications:", error);
        Alert.alert("Error", "Failed to load applications.");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  // Function to sign out the admin
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success", "Signed out successfully!");
      navigation.replace("(auth)/index"); // Redirect to Login page
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out.");
    }
  };

  // Function to update Cleaner Application Status
  const updateApplicationStatus = async (id, newStatus, userId) => {
    try {
      await updateDoc(doc(db, "cleanerApplications", id), { status: newStatus });

      // If approved, update the user's role to "cleaner"
      if (newStatus === "Approved") {
        await updateDoc(doc(db, "users", userId), { role: "cleaner" });
      }

      Alert.alert("Success", `Application status updated to ${newStatus}`);
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
      );
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update status.");
    }
  };

  // Function to change user role
  const updateUserRole = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      Alert.alert("Success", `User role updated to ${newRole}`);
    } catch (error) {
      console.error("Error updating role:", error);
      Alert.alert("Error", "Failed to update role.");
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <View style={{ flex: 1, padding: 10, paddingBottom:50 }}>
      {/* Sign Out Button */}
      <TouchableOpacity
        onPress={handleSignOut}
        style={{
          backgroundColor: "red",
          padding: 10,
          borderRadius: 5,
          alignSelf: "flex-end",
          marginBottom: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>
          Sign Out
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
        Cleaner Applications
      </Text>
      
      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 15,
              paddingBottom:10,
              marginVertical: 8,
              backgroundColor: "#f9f9f9",
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{item.name}</Text>
            <Text>Email: {item.email}</Text>
            <Text>Phone: {item.phone}</Text>
            <Text>Experience: {item.experience} years</Text>
            <Text>Status: {item.status || "Pending"}</Text>

            {/* Approve / Reject Buttons */}
            {item.status !== "Approved" && (
              <TouchableOpacity
                onPress={() => updateApplicationStatus(item.id, "Approved", item.userId)}
                style={{
                  backgroundColor: "green",
                  padding: 10,
                  marginTop: 10,
                  borderRadius: 5,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>Approve</Text>
              </TouchableOpacity>
            )}

            {item.status !== "Rejected" && (
              <TouchableOpacity
                onPress={() => updateApplicationStatus(item.id, "Rejected", item.userId)}
                style={{
                  backgroundColor: "red",
                  padding: 10,
                  marginTop: 5,
                  borderRadius: 5,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>Reject</Text>
              </TouchableOpacity>
            )}

            {/* Change User Role Buttons */}
            <Text style={{ marginTop: 10, fontWeight: "bold" }}>Change User Role:</Text>

            <TouchableOpacity
              onPress={() => updateUserRole(item.userId, "admin")}
              style={{
                backgroundColor: "#007bff",
                padding: 10,
                marginTop: 5,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>Promote to Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => updateUserRole(item.userId, "cleaner")}
              style={{
                backgroundColor: "#ffa500",
                padding: 10,
                marginTop: 5,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>Set as Cleaner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => updateUserRole(item.userId, "user")}
              style={{
                backgroundColor: "#6c757d",
                padding: 10,
                marginTop: 5,
                borderRadius: 5,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>Set as User</Text>
            </TouchableOpacity>
          </View>
        )}
        
      />
    </View>
  );
};

export default AdminCleanerApplications;