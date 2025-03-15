import 'react-native-get-random-values';
import React, { useState, useRef } from 'react';
import {
  View,
  ImageBackground,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import logo from '@/assets/images/logo.png';
import bground from '@/assets/images/light-purple-glitter-background-nkx73.png';
import DateTimePicker from '@react-native-community/datetimepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useRouter } from 'expo-router';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GOOGLE_KEY from '../googleConfig';
import * as Location from 'expo-location';
import axios from 'axios';
import Feather from 'react-native-vector-icons/Feather';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const RequestCleaning = () => {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const locationRef = useRef(null);

  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    submitCleaningRequest(location, date, time, additionalNotes, router);
  };

  const clearForm = () => {
    setLocation('');
    setDate(new Date());
    setTime(new Date());
    setAdditionalNotes('');
    locationRef.current?.setAddressText('');
  };

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Location permission is required. Please grant permission.');
        return;
      }
      let userLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = userLocation.coords;

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY.GOOGLE_MAPS_API_KEY}`
      );

      if (response.data.status === 'OK') {
        const address = response.data.results[0].formatted_address;
        setLocation(address);
        locationRef.current?.setAddressText(address);
      } else {
        showError('Unable to fetch address from coordinates.');
      }
    } catch (error) {
      console.error('Failed to get location:', error);
      showError('Failed to get current location. Please try again.');
    }
  };

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorPopup(true);
  };

  const closeErrorPopup = () => {
    setShowErrorPopup(false);
  };

  const submitCleaningRequest = async () => {
    const user = auth.currentUser;
    if (!user) {
      showError('You must be logged in to submit a request.');
      return;
    }

    if (!location || !date || !time) {
      showError('Please fill out all required fields.');
      return;
    }

    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(time.getHours());
    selectedDateTime.setMinutes(time.getMinutes());

    if (selectedDateTime <= new Date()) {
      showError('Invalid time: You cannot select a past date or time.');
      return;
    }

    let userEmail;
    try {
      userEmail = await AsyncStorage.getItem('email');
      if (!userEmail) {
        showError('No user email found. Please log in again.');
        return;
      }
    } catch (err) {
      console.error('Error reading email from AsyncStorage:', err);
      showError('Error accessing user email. Please log in again.');
      return;
    }

    try {
      const request = {
        userId: user.uid,
        userEmail,
        location,
        date: date.toISOString().split('T')[0],
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        additionalNotes: additionalNotes || 'No additional notes',
        status: 'pending',
        timestamp: new Date(),
      };

      await addDoc(collection(db, 'cleaningRequests'), request);
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Failed to submit request:', error);
      showError('Failed to submit request. Please try again.');
    }
  };

  const closeSuccessPopup = () => {
    setShowSuccessPopup(false);
    clearForm();
  };

  return (
    <>
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .datePickerPopper {
                z-index: 9999999 !important;
              }
            `,
          }}
        />
      )}
      <ImageBackground source={bground} style={styles.background}>
        <ScrollView contentContainerStyle={styles.overlay} keyboardShouldPersistTaps='handled'>
          <View style={styles.logoContainer}>
            <Animated.Image
              entering={FadeInRight.delay(300).duration(2000)}
              source={logo}
              style={styles.logo}
            />
          </View>

          <View style={styles.formWrapper}>
            <Text style={styles.title}>Request a Cleaning Service</Text>

            <View style={styles.section}>
              <Feather name="map-pin" size={22} color="#555" style={styles.icon} />
              <View style={styles.locationRow}>
                <GooglePlacesAutocomplete
                  ref={locationRef}
                  placeholder="Enter location"
                  fetchDetails={true}
                  enablePoweredByContainer={false}
                  onPress={(data) => setLocation(data.description)}
                  query={{
                    key: GOOGLE_KEY.GOOGLE_MAPS_API_KEY,
                    language: 'en',
                  }}
                  styles={{
                    container: styles.autocompleteContainer,
                    textInput: styles.input,
                    listView: styles.autocompleteListView,
                  }}
                />
                <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
                  <Text style={styles.pinEmoji}>📍</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <View style={styles.section}>
                <Feather name="calendar" size={22} color="#555" style={styles.icon} />
                {Platform.OS === 'web' ? (
                  <View style={styles.datePickerWrapper}>
                    <DatePicker
                      selected={date}
                      onChange={(newDate) => setDate(newDate)}
                      minDate={new Date()}
                      dateFormat="MM/dd/yyyy"
                      popperPlacement="top-start"
                      popperClassName="datePickerPopper"
                      popperProps={{ strategy: 'fixed' }}
                      portalId="root-portal"
                      customInput={
                        <TextInput
                          style={styles.datePickerInput}
                          value={date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                          onChange={() => {}}
                        />
                      }
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                      <Text style={styles.dateText}>
                        {date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) setDate(selectedDate);
                        }}
                      />
                    )}
                  </>
                )}
              </View>

              <View style={styles.section}>
                <Feather name="clock" size={22} color="#555" style={styles.icon} />
                {Platform.OS === 'web' ? (
                  <View style={styles.datePickerWrapper}>
                    <DatePicker
                      selected={time}
                      onChange={(newTime) => setTime(newTime)}
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={15}
                      timeCaption="Time"
                      dateFormat="hh:mm aa"
                      popperPlacement="top-start"
                      popperClassName="datePickerPopper"
                      popperProps={{ strategy: 'fixed' }}
                      portalId="root-portal"
                      customInput={
                        <TextInput
                          style={styles.datePickerInput}
                          value={time.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                          onChange={() => {}}
                        />
                      }
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
                      <Text style={styles.dateText}>
                        {time.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    </TouchableOpacity>
                    {showTimePicker && (
                      <DateTimePicker
                        value={time}
                        mode="time"
                        display="default"
                        onChange={(event, selectedTime) => {
                          setShowTimePicker(false);
                          if (selectedTime) setTime(selectedTime);
                        }}
                      />
                    )}
                  </>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Feather name="file-text" size={22} color="#555" style={styles.icon} />
              <TextInput
                style={styles.notesInput}
                placeholder="Additional notes (optional)"
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                multiline
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>
                <Feather name="send" size={16} color="#fff" style={styles.submitIcon} /> Submit Request
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>

      {showSuccessPopup && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Feather name="check-circle" size={64} color="#28a745" style={styles.popupIcon} />
            <Text style={styles.popupTitle}>Success!</Text>
            <Text style={styles.popupMessage}>Your cleaning request has been submitted.</Text>
            <TouchableOpacity style={styles.popupButton} onPress={closeSuccessPopup}>
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showErrorPopup && (
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Feather name="alert-triangle" size={64} color="#d9534f" style={styles.popupIcon} />
            <Text style={styles.popupTitle}>Error</Text>
            <Text style={styles.popupMessage}>{errorMessage}</Text>
            <TouchableOpacity style={styles.popupButton} onPress={closeErrorPopup}>
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    resizeMode: 'cover',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 500,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
    width: '100%',
  },
  icon: {
    marginRight: 10,
  },
  locationRow: {
    flex: 1,
    flexDirection: 'row',
  },
  autocompleteContainer: {
    flex: 1,
    marginRight: 10,
  },
  autocompleteListView: {
    position: 'absolute',
    top: 55,
    zIndex: 1001,
    backgroundColor: '#fff',
    elevation: 5,
  },
  locationButton: {
    backgroundColor: '#fceaea',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    height: 45,
    width: 45,
    borderWidth: 2,
    borderColor: '#ff4d4d',
  },
  pinEmoji: {
    fontSize: 30,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  datePickerInput: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    width: '100%',
  },
  notesInput: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    height: 100,
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  datePickerWrapper: {
    flex: 1,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#FF5722',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  submitIcon: {
    marginRight: 5,
  },
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  popupIcon: {
    marginBottom: 20,
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  popupMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  popupButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  popupButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default RequestCleaning;