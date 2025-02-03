import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const HomePage = () => {
  const router = useRouter(); // Initialize the router

  // Define the navigateTo function
  const navigateTo = (page) => {
    router.push(page); // Navigate to the specified route
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Welcome to the Home Page</Text>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateTo('profile')}
        >
          <Text style={styles.cardText}>Profile</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.footer}>Enjoy navigating through the app!</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  card: {
    width: '45%',
    padding: 20,
    marginVertical: 10,
    backgroundColor: '#007BFF',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default HomePage;