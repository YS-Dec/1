import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { AntDesign } from '@expo/vector-icons';
import backgroundImage from '@/assets/images/light-purple-glitter-background-nkx73.png';

/**
 * AvailableRequestsScreen shows pending cleaning requests
 * and allows users to accept tasks.
 * @returns {JSX.Element} The rendered available requests screen.
 */
const AvailableRequestsScreen = () => {
  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  /**
   * Fetches all pending cleaning requests from Firestore.
   */
  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const querySnapshot = await getDocs(collection(db, 'cleaningRequests'));
      const fetchedRequests = querySnapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .filter((request) => request.status === 'pending');
      setRequests(fetchedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Handles refreshing the request list.
   */
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchRequests();
    } catch (error) {
      console.error('Error refreshing requests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Handles accepting a cleaning request.
   * @param {string} requestId - The ID of the cleaning request.
   */
  const handleAcceptRequest = async (requestId) => {
    const user = auth.currentUser;

    if (!user) {
      alert('You must be logged in to accept a request.');
      return;
    }

    const cleanerEmail = user.email;

    try {
      const requestRef = doc(db, 'cleaningRequests', requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        alert('Request does not exist.');
        return;
      }

      const requestData = requestSnap.data();

      if (user.uid === requestData.userId) {
        alert('You cannot accept your own request.');
        return;
      }

      if (requestData.status !== 'pending') {
        alert('This request has already been accepted.');
        return;
      }

      await updateDoc(requestRef, {
        status: 'accepted',
        cleanerId: user.uid,
        cleanerEmail: cleanerEmail,
      });

      setRequests((prevRequests) =>
        prevRequests.filter((req) => req.id !== requestId)
      );

      alert('Request successfully assigned to you!');
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Error: You don\'t have permission to accept this request.');
    }
  };

  /**
   * Renders each cleaning request item.
   * @param {object} param - The item object from FlatList.
   * @param {object} param.item - Cleaning request object.
   * @returns {JSX.Element} The rendered request item.
   */
  const renderRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <Text style={styles.text}>📍 Location: {item.location}</Text>
      <Text style={styles.text}>📅 Date: {item.date}</Text>
      <Text style={styles.text}>⏰ Time: {item.time}</Text>
      <Text style={styles.text}>📝 Notes: {item.additionalNotes}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>
      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item.id)}
        >
          <Text style={styles.buttonText}>Accept Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode='cover'
    >
      <View style={styles.container}>
        <Text style={styles.title}>Available Cleaning Requests</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <AntDesign
            name='reload1'
            size={24}
            color='white'
          />
          <Text style={styles.buttonText}>
            {refreshing ? 'Refreshing...' : 'Click Here to Refresh'}
          </Text>
        </TouchableOpacity>
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          ListEmptyComponent={
            <Text style={styles.noRequests}>No available requests</Text>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  requestItem: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'blue',
  },
  acceptButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noRequests: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
  },
  refreshButton: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
});

export default AvailableRequestsScreen;