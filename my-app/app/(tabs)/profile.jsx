import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  Alert,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Button,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';



const Profile = () => {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');


  // Fetch the user's profile data from the server when the component mounts
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Retrieve the logged-in user's email from AsyncStorage
        const email = await AsyncStorage.getItem('email');
        if (!email) {
          throw new Error('No email found. Please log in again.');
        }
        const response = await fetch(`http://10.0.0.64:5001/profile?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }
  
        const data = await response.json();
        if (data.profile) {
          setUserInfo(data.profile);
          setSelectedRole(data.profile.role || '');  // Set default role if missing
        } else {
          throw new Error('Profile data is missing');
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchProfileData();
  }, []);

  const pickImage = async () => {
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access photos is needed!');
        return;
      }
  
      // Build the options object. We'll add mediaTypes only if available.
      const options = {
        allowsEditing: true,
        aspect: [1, 1],  // Square aspect ratio for profile pictures
        quality: 1,
      };
  
      // Conditionally set the mediaTypes property:
      if (ImagePicker.MediaType && ImagePicker.MediaType.Images) {
        options.mediaTypes = ImagePicker.MediaType.Images;
      } else if (ImagePicker.MediaTypeOptions && ImagePicker.MediaTypeOptions.Images) {
        // Fallback for older versions
        options.mediaTypes = ImagePicker.MediaTypeOptions.Images;
      }
      // If neither exists, you can omit the property so that it defaults to images
  
      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync(options);
  
      // Check the result structure. Newer versions use result.canceled and result.assets.
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        uploadProfilePicture(uri);
      } 
      // For compatibility with older versions (if needed), check for result.uri
      else if (!result.canceled && result.uri) {
        uploadProfilePicture(result.uri);
      } else {
        console.log('Image picker canceled or no image selected.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'An error occurred while selecting the image.');
    }
  };

  const handleRoleChange = async (itemValue) => {
    setSelectedRole(itemValue);
    try {
      const email = await AsyncStorage.getItem('email');
      const response = await fetch('http://10.0.0.64:5001/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role: itemValue }),
      });
      if (!response.ok) {
        throw new Error('Failed to update role');
      }
      Alert.alert('Success', 'Role updated successfully!');
      setUserInfo(prev => ({ ...prev, role: itemValue }));
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'An error occurred while updating the role.');
    }
  };


  const uploadProfilePicture = async (uri) => {
    try {
      if (!uri) {
        throw new Error('No URI provided');
      }
    
      // Extract the filename from the URI
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image';
    
      // Create a FormData object and append the file and email
      const formData = new FormData();
      formData.append('profilePicture', { uri, name: filename, type });
    
      // Retrieve the user's email from AsyncStorage
      const email = await AsyncStorage.getItem('email');
      if (!email) {
        throw new Error('No email found. Please log in again.');
      }
      formData.append('email', email);
    
      // Note: Do NOT set the 'Content-Type' header manually;
      // let the fetch API set it with the proper boundary.
      console.log('Uploading file:', { uri, filename, type, email });
      const response = await fetch('http://10.0.0.64:5001/upload-profile-picture', {
        method: 'POST',
        body: formData,
      });
    
      // For debugging, log the raw response text if the upload fails.
      if (!response.ok) {
        const text = await response.text();
        console.error('Upload error response:', text);
        throw new Error('Failed to upload profile picture');
      }
    
      const data = await response.json();
      if (data.success && data.profilePictureUrl) {
        Alert.alert('Success', 'Profile picture updated!');
        // Update the local user info with the new profile picture URL
        setUserInfo(prev => ({ ...prev, profilePictureUrl: data.profilePictureUrl }));
      } else {
        Alert.alert('Upload failed', data.message || 'Error updating profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Upload Error', 'An error occurred while uploading the picture.');
    }
  };
  

  // Handle sign out: clear any saved auth data and navigate to login
  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('email');
      await AsyncStorage.removeItem('userData');
      router.replace('/(auth)'); // Navigate to the login page in your auth group
    } catch (err) {
      console.error('Error during sign-out:', err);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile Info</Text>
  
      {/* Profile Picture Section */}
      <TouchableOpacity onPress={pickImage}>
        {userInfo && userInfo.profilePictureUrl ? (
          <Image source={{ uri: userInfo.profilePictureUrl }} style={styles.profilePicture} />
        ) : (
          <View style={[styles.profilePicture, styles.placeholder]}>
            <Text style={styles.placeholderText}>Add Picture</Text>
          </View>
        )}
      </TouchableOpacity>
  
      {/* Profile Details */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Name:</Text>
        <Text style={styles.infoValue}>{userInfo.fullName}</Text>
      </View>
  
      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Email:</Text>
        <Text style={styles.infoValue}>{userInfo.email}</Text>
      </View>

      {/* Role Picker */}
      <View style={styles.pickerContainer}>
        <Text style={styles.infoLabel}>Role:</Text>
        <Picker
          selectedValue={selectedRole}
          onValueChange={(itemValue) => handleRoleChange(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select Role" value="" color="#333" />
          <Picker.Item label="User" value="user" color="#333"/>
          <Picker.Item label="Service-Provider" value="Service-provider" color="#333"/>
        </Picker>
      </View>
  
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
  },
  infoValue: {
    fontSize: 18,
    color: '#333',
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#ddd',
    marginBottom: 20,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#555',
  },
  signOutButton: {
    marginTop: 40,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
  },
  pickerContainer: {
    width: '100%',
    marginVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',  // Temporary for debugging layout
    height: 100,
  },
  picker: {
    height: 50,
    width: '100%',
    justifyContent: 'center',
  },
  
});

export default Profile;

