import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AntDesign } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import backgroundImage from '@/assets/images/light-purple-glitter-background-nkx73.png';

const COLOR_PRIMARY = '#BF40BF';

/**
 * Plan tab displays cleaning requests for users.
 * Allows request editing, rating, and deletion.
 * @returns {JSX.Element} The rendered plan screen.
 */
const Plan = () => {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState({});
  const [rating, setRating] = useState(0);
  const [isRatingModalVisible, setRatingModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newTime, setNewTime] = useState(new Date());
  const [newDate, setNewDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchRequests(currentUser.uid);
      } else {
        setUser(null);
        setRequests([]);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  /**
   * Fetches cleaning requests for the authenticated user.
   * @param {string} userId - The authenticated user's ID.
   */
  const fetchRequests = async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'cleaningRequests'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const userRequests = querySnapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setRequests(userRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handles rating a cleaner.
   * @param {string} cleanerId - The cleaner's ID.
   * @param {number} ratingValue - The rating value (1-5).
   */
  const handleRating = async (cleanerId, ratingValue) => {
    if (!cleanerId) {
      console.error('Error: cleanerId is undefined');
      Alert.alert('Error', 'Cleaner ID is missing.');
      return;
    }

    try {
      const cleanerRef = doc(db, 'users', cleanerId);
      const docSnap = await getDoc(cleanerRef);
      if (!docSnap.exists()) {
        console.error('Error: Cleaner document does not exist.');
        Alert.alert('Error', 'Cleaner profile not found.');
        return;
      }

      const updatedData = docSnap.data();
      const currentTotalPoints = updatedData.totalPoints || 0;
      const currentTotalRatings = updatedData.totalRatings || 0;

      const newTotalPoints = currentTotalPoints + ratingValue;
      const newTotalRatings = currentTotalRatings + 1;
      const newAverage = newTotalRatings > 0 ? newTotalPoints / newTotalRatings : 0;

      await updateDoc(cleanerRef, {
        totalPoints: increment(ratingValue),
        totalRatings: increment(1),
        average: newAverage,
      });

      Alert.alert('Success', 'Rating updated for cleaner!');
    } catch (error) {
      console.error('Error updating cleaner\'s rating:', error.message);
      Alert.alert('Error', 'Failed to update rating.');
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
      console.error('Error refreshing requests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Opens the rating modal for a specific request.
   * @param {Object} request - The request object to rate.
   */
  const openRatingModal = (request) => {
    console.log('Opening rating modal for request:', request);
    setSelectedRequest(request);
    setRating(request.rating || 0);
    setRatingModalVisible(true);
  };

  /**
   * Parses a time string into a Date object.
   * @param {string} timeStr - The time string to parse.
   * @returns {Date} The parsed Date object.
   */
  const parseTimeString = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return new Date();

    const parts = timeStr.split(' ');
    if (parts.length !== 2) return new Date();

    const [time, modifier] = parts;
    if (!modifier || (modifier.toUpperCase() !== 'AM' && modifier.toUpperCase() !== 'PM')) {
      return new Date();
    }

    let [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return new Date();

    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  /**
   * Opens the edit modal for a specific request.
   * @param {Object} request - The request object to edit.
   */
  const openEditModal = (request) => {
    console.log('Opening edit modal for request:', request);
    setSelectedRequest(request);
    setNewLocation(request.location || '');
    setNewTime(parseTimeString(request.time));
    setNewDate(request.date ? new Date(request.date) : new Date());
    setEditModalVisible(true);
  };

  /**
   * Submits a rating for the selected request.
   */
  const submitRating = async () => {
    if (!selectedRequest || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const requestRef = doc(db, 'cleaningRequests', selectedRequest.id);
      await updateDoc(requestRef, { rating });

      Alert.alert('Thank You!', 'Your rating has been submitted.');
      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id ? { ...req, rating } : req
        )
      );
      setRatingModalVisible(false);
    } catch (error) {
      console.error('Error updating rating:', error);
      Alert.alert('Error', 'Failed to submit rating.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Renders star rating icons.
   * @param {number} ratingValue - The current rating.
   * @param {boolean} interactive - Whether the stars are clickable.
   * @returns {JSX.Element} The rendered star rating.
   */
  const renderStars = (ratingValue, interactive = false) => {
    return (
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() =>
              interactive && handleRating(selectedRequest.cleanerId, star) && setRating(star)
            }
            disabled={!interactive}
          >
            <AntDesign
              name={star <= ratingValue ? 'star' : 'staro'}
              size={30}
              color='#FFD700'
              style={{ marginHorizontal: 3 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  /**
   * Fetches the assigned cleaner's email for a specific request.
   * @param {string} requestId - The ID of the cleaning request.
   */
  const fetchCleanerEmail = async (requestId) => {
    try {
      const userRef = doc(db, 'cleaningRequests', requestId);
      const requestSnap = await getDoc(userRef);

      if (!requestSnap.exists()) {
        Alert.alert('Error', 'Request not found.');
        return;
      }

      const requestData = requestSnap.data();
      const cleanerId = requestData.cleanerId;

      if (!cleanerId) {
        Alert.alert('No Cleaner Assigned', 'This request has not been accepted by a cleaner yet.');
        return;
      }

      const cleanerRef = doc(db, 'users', cleanerId);
      const cleanerSnap = await getDoc(cleanerRef);

      if (!cleanerSnap.exists()) {
        Alert.alert('Error', 'Cleaner information not found.');
        return;
      }

      const cleanerEmail = cleanerSnap.data().email;

      setSelectedEmail((prev) => ({
        ...prev,
        [requestId]: prev[requestId] ? null : cleanerEmail,
      }));
    } catch (error) {
      console.error('Error fetching user email:', error);
      setSelectedEmail((prev) => ({ ...prev, [requestId]: 'Error fetching email' }));
    }
  };

  /**
   * Edits a request with new location, time, and/or date.
   */
  const editRequest = async () => {
    if (!selectedRequest) return;

    const currentDateTime = new Date();
    const selectedDate = newDate instanceof Date ? new Date(newDate.getTime()) : new Date();
    const selectedTime = newTime instanceof Date ? new Date(newTime.getTime()) : new Date();

    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0
    );

    if (selectedDateTime < currentDateTime) {
      Alert.alert(
        'Invalid Date/Time',
        'Please select a future date and time. Past schedules are not allowed.'
      );
      return;
    }

    const formattedDate = selectedDate.toISOString().split('T')[0];
    const formattedTime = selectedTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (Platform.OS === 'web') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formattedDate)) {
        Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
        return;
      }
    }

    try {
      const requestRef = doc(db, 'cleaningRequests', selectedRequest.id);
      await updateDoc(requestRef, {
        location: newLocation,
        time: formattedTime,
        date: formattedDate,
      });

      Alert.alert('Updated!', 'The request has been updated.');
      setRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id
            ? { ...req, location: newLocation, time: formattedTime, date: formattedDate }
            : req
        )
      );
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating request:', error);
      Alert.alert('Error', 'Failed to update request.');
    }
  };

  /**
   * Deletes a request from Firestore.
   * @param {string} requestId - The ID of the request to delete.
   */
  const deleteRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, 'cleaningRequests', requestId));
      Alert.alert('Deleted', 'Your request has been removed.');
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error('Error deleting request:', error);
      Alert.alert('Error', 'Failed to delete request.');
    }
  };

  /**
   * Renders a single cleaning request card.
   * @param {object} param - The item object from FlatList.
   * @param {object} param.item - Cleaning request data.
   * @returns {JSX.Element} The rendered request card.
   */
  const renderRequest = ({ item }) => (
    <View style={[styles.requestCard, { borderColor: COLOR_PRIMARY }]}>
      <Text style={[styles.serviceType, { color: COLOR_PRIMARY }]}>{item.location}</Text>
      <Text style={styles.details}>
        📅 Date: {item.date instanceof Date ? item.date.toDateString() : item.date}
      </Text>
      <Text style={styles.details}>
        🕒 Time: {item.time instanceof Date ? item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : item.time}
      </Text>
      <Text style={styles.details}>📝 Notes: {item.additionalNotes || 'N/A'}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>
      <TouchableOpacity style={styles.showEmailButton} onPress={() => fetchCleanerEmail(item.id)}>
        <Text style={styles.showEmailText}>
          {selectedEmail[item.id] ? 'Hide Email' : 'Contact Cleaner'}
        </Text>
      </TouchableOpacity>
      {selectedEmail[item.id] && <Text style={styles.emailText}>📧 {selectedEmail[item.id]}</Text>}
      {item.status === 'Completed' && (
        <View>
          <Text style={styles.ratingLabel}>Rating:</Text>
          {renderStars(item.rating || 0)}
        </View>
      )}
      {item.status === 'Completed' && (
        <TouchableOpacity
          style={[
            styles.rateButton,
            item.rating ? { backgroundColor: '#ccc' } : {},
            isSubmitting ? { backgroundColor: '#ccc' } : {},
          ]}
          onPress={() => !item.rating && !isSubmitting && openRatingModal(item)}
          disabled={Boolean(item.rating) || isSubmitting}
        >
          <Text style={styles.buttonText}>{item.rating ? 'Rated' : 'Rate Task'}</Text>
        </TouchableOpacity>
      )}
      {item.status !== 'Completed' && (
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: COLOR_PRIMARY }]}
          onPress={() => openEditModal(item)}
        >
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
        <ActivityIndicator size='large' color={COLOR_PRIMARY} />
      </View>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.container}>
        <Text style={[styles.header, { color: '#000000' }]}>Your Cleaning Requests</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <AntDesign name='reload1' size={24} color='white' />
          <Text style={[styles.buttonText, { color: 'white' }]}>Click Here to Refresh</Text>
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
        <Modal visible={isRatingModalVisible} transparent animationType='slide'>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rate the Cleaning Task</Text>
              {renderStars(rating, true)}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && { backgroundColor: '#ccc' }]}
                onPress={submitRating}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal visible={isEditModalVisible} transparent animationType='slide'>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Request</Text>
              <TextInput
                style={styles.input}
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder='Enter new location'
              />
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.dateText}>
                  {newTime ? newTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select Time'}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={newTime}
                  mode='time'
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (selectedTime !== undefined) {
                      setNewTime(selectedTime);
                    }
                  }}
                />
              )}
              <Text style={styles.label}>Select Date:</Text>
              {Platform.OS === 'web' ? (
                <input
                  type='date'
                  style={styles.input}
                  value={newDate}
                  onChange={(event) => setNewDate(event.target.value)}
                />
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                    <Text style={styles.dateText}>{newDate.toDateString()}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={newDate}
                      mode='date'
                      display='default'
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
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
    backgroundColor: 'transparent',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  noRequests: {
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
    marginTop: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 2,
    elevation: 3,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  details: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#28A745',
  },
  editButton: {
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  rateButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  cancelButton: {
    color: '#FF3B30',
    fontSize: 16,
    marginTop: 10,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  datePickerButton: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  refreshButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'black',
  },
  showEmailButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#007BFF',
    alignItems: 'center',
  },
  showEmailText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emailText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default Plan;