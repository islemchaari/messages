import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Button, TextInput } from 'react-native'; 
import { db, auth } from '../config/firebaseConfig';
import { collection, onSnapshot } from '@firebase/firestore';
import { signOut } from '@firebase/auth';
import { FontAwesome5 } from '@expo/vector-icons'; // Importation des icônes

const AuthenticatedScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const currentUser = auth.currentUser; // Utilisateur actuellement connecté

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs
        .map((doc) => ({ ...doc.data(), _id: doc.id })) // Inclure _id pour chaque utilisateur
        .filter((user) => user._id !== currentUser.uid); // Exclure l'utilisateur connecté
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace('Auth'); // Naviguer vers l'écran de connexion après déconnexion
    } catch (error) {
      console.error('Sign Out error:', error.message);
    }
  };

  // Fonction pour générer une couleur aléatoire
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  return (
    <View style={styles.container}>
      {/* Barre de recherche avec le logo et l'icône des messages */}
      <View style={styles.searchBar}>
        <Image source={require('./image 19.png')} style={styles.logo} />
        <FontAwesome5 name="search" size={20} color="#000" style={styles.searchIcon} /> {/* Icône loupe */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search for something here"
          placeholderTextColor="#000"
        />
        <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
  <Image source={require('./Message.png')} style={styles.messageIcon} />
</TouchableOpacity>

      </View>

      <Text style={styles.friendsSuggestion}>Friends suggestion</Text>

      {/* Liste des utilisateurs */}
      <FlatList
        data={users}
        horizontal
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { user: item })}>
            <View style={styles.userCard}>
              {/* Bulle colorée avec la première lettre de l'utilisateur */}
              <View style={[styles.bubble, { backgroundColor: getRandomColor() }]}>
                <Text style={styles.bubbleText}>
                  {item.name ? item.name.charAt(0).toUpperCase() : 'A'}  {/* Majuscule et première lettre */}
                </Text>
              </View>
              <Text style={styles.userName}>{item.name || 'Unnamed User'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Bouton de déconnexion */}
      <Button title="Log Out" onPress={handleSignOut} color="#e74c3c" />

      {/* Barre de navigation en bas */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomIcon} onPress={() => navigation.navigate('Feed')}>
          <FontAwesome5 name="home" size={20} color="#000" />
          <Text style={styles.bottomText}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomIcon} onPress={() => navigation.navigate('Duo')}>
          <FontAwesome5 name="users" size={20} color="#000" />
          <Text style={styles.bottomText}>Duo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomIcon} onPress={() => navigation.navigate('Community')}>
          <FontAwesome5 name="globe" size={20} color="#000" />
          <Text style={styles.bottomText}>Community</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomIcon} onPress={() => navigation.navigate('Forum')}>
          <FontAwesome5 name="comments" size={20} color="#000" />
          <Text style={styles.bottomText}>Forum</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomIcon} onPress={() => navigation.navigate('Notifications')}>
          <FontAwesome5 name="bell" size={20} color="#000" />
          <Text style={styles.bottomText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomIcon} onPress={() => navigation.navigate('Profile')}>
          <FontAwesome5 name="user" size={20} color="#000" />
          <Text style={styles.bottomText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomIcon} onPress={() => navigation.navigate('Settings')}>
          <FontAwesome5 name="cogs" size={20} color="#000" />
          <Text style={styles.bottomText}>Settings</Text>
        </TouchableOpacity>
        
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',  // Fond blanc partout
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',  // Alignement à gauche
    marginTop: 10, // Placer la barre de recherche tout en haut
    paddingHorizontal: 10,
    marginBottom: 20, // Ajouter un peu d'espace
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 1, // Espacement entre logo et champ
  },
  searchIcon: {
    marginLeft: 10, // Espacement entre logo et icône de la loupe
  },
  searchInput: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Roboto-Regular",
    color: "#000",  // Texte en noir pour plus de lisibilité
    width: 250,  // Largeur du champ de texte
    height: 40,  // Hauteur du champ
    borderWidth: 1,
    borderColor: '#ccc',  // Bordure grise pour le champ
    borderRadius: 5,  // Arrondir les bords du champ
    paddingLeft: 10,  // Ajouter du padding à gauche
  },
  messageIcon: {
    width: 20,
    height: 20,
    marginLeft: 10,  // Espacement entre champ et icône
    tintColor: "#000", // Icône en noir
  },
  friendsSuggestion: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: "Roboto-Bold",
    color: "#000",  // Texte noir
    textAlign: "left",
    marginBottom: 20,
  },
  userCard: {
    alignItems: 'center',
    marginRight: 0.2,  // Réduire la marge entre les cartes d'utilisateurs
    padding: 10,
    borderRadius: 10,
  },
  bubble: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,  // Espacement plus faible entre les bulles
  },
  bubbleText: {
    fontSize: 18,
    color: '#fff',
    textTransform: 'uppercase',  // Majuscule
    textAlign: 'center',
  },
  userName: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    fontFamily: 'Roboto-Medium',
    color: '#000',  // Texte noir
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,  // Augmenter la hauteur de la barre
    backgroundColor: '#fff', // Fond blanc pour la barre de bas
    borderTopWidth: 1,
    borderTopColor: '#ccc',  // Bordure grise en haut de la barre
  },
  bottomIcon: {
    alignItems: 'center',
  },
  bottomText: {
    color: '#000',  // Texte noir pour les icônes
    fontSize: 12,  // Taille de texte plus petite
  },
});

export default AuthenticatedScreen;