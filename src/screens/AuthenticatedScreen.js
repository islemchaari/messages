import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Button, TextInput } from 'react-native'; 
import { db, auth } from '../config/firebaseConfig';
import { collection, onSnapshot, query, where } from '@firebase/firestore'; // Importation des méthodes nécessaires
import { signOut } from '@firebase/auth';
import { FontAwesome5 } from '@expo/vector-icons'; 

const AuthenticatedScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [unreadDiscussionsCount, setUnreadDiscussionsCount] = useState(0); // Nombre de discussions non lues
  const currentUser = auth.currentUser; // Utilisateur connecté

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs
        .map((doc) => ({ ...doc.data(), _id: doc.id }))
        .filter((user) => user._id !== currentUser.uid); // Exclure l'utilisateur actuel
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, []);

  // Calcul du nombre de discussions non lues
  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'messages'), 
      where('receiverId', '==', currentUser.uid),  // Filtrer les messages destinés à l'utilisateur connecté
      where('isRead', '==', false)  // Filtrer ceux qui ne sont pas lus
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      // Récupérer les IDs des utilisateurs avec des messages non lus
      const unreadUserIds = new Set();

      snapshot.docs.forEach((doc) => {
        const senderId = doc.data().senderId; // ID de l'expéditeur
        unreadUserIds.add(senderId); // Ajouter l'ID de l'expéditeur, cela garantit qu'une discussion ne soit comptée qu'une seule fois
      });

      setUnreadDiscussionsCount(unreadUserIds.size); // Le nombre de discussions distinctes avec des messages non lus
    });

    return () => unsubscribeMessages();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace('Auth'); // Redirection après la déconnexion
    } catch (error) {
      console.error('Sign Out error:', error.message);
    }
  };

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
      {/* Barre de recherche et icônes */}
      <View style={styles.searchBar}>
        <Image source={require('./image 19.png')} style={styles.logo} />
        <FontAwesome5 name="search" size={20} color="#000" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Search for something here" placeholderTextColor="#000" />
        <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
          <View style={styles.messageIconContainer}>
            <FontAwesome5 name="comment-dots" size={20} color="#000" style={styles.messageIcon} />
            {unreadDiscussionsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadDiscussionsCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.friendsSuggestion}>Friends suggestion</Text>

      <FlatList
        data={users}
        horizontal
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Chat', { user: item })}>
            <View style={styles.userCard}>
              <View style={[styles.bubble, { backgroundColor: getRandomColor() }]} >
                <Text style={styles.bubbleText}>
                  {item.name ? item.name.charAt(0).toUpperCase() : 'A'}
                </Text>
              </View>
              <Text style={styles.userName}>{item.name || 'Unnamed User'}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Button title="Log Out" onPress={handleSignOut} color="#e74c3c" />

      {/* Navigation en bas */}
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
  // Ajoutez votre style ici...

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
  messageIconContainer: {
    position: 'relative', // Pour positionner le badge par rapport à l'icône
  },
  messageIcon: {
    width: 20,
    height: 20,
    marginLeft: 10,  // Espacement entre champ et icône
    tintColor: "#000", // Icône en noir
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
