import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput } from 'react-native';
import { db, auth } from '../config/firebaseConfig';
import { collection, onSnapshot, getDoc, doc, updateDoc, setDoc } from '@firebase/firestore';
import { FontAwesome5 } from '@expo/vector-icons';

const MessagesScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFavorites, setShowFavorites] = useState(false);
  const [searchText, setSearchText] = useState(''); // State for search text
  const currentUser = auth.currentUser;

  // Fonction pour récupérer les conversations et les favoris
  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const favouriteRef = collection(db, 'favourite');

    const unsubscribeMessages = onSnapshot(messagesRef, async (snapshot) => {
      const conversationsMap = new Map();

      snapshot.docs.forEach((doc) => {
        const { senderId, receiverId, text, createdAt, isRead } = doc.data();

        if (senderId === currentUser.uid || receiverId === currentUser.uid) {
          const contactId = senderId !== currentUser.uid ? senderId : receiverId;

          // Garder le dernier message de la conversation
          if (!conversationsMap.has(contactId) || createdAt > conversationsMap.get(contactId).createdAt) {
            conversationsMap.set(contactId, { text, createdAt, senderId, receiverId, isRead });
          }

          // Compter les nouveaux messages (non lus)
          if (receiverId === currentUser.uid && !isRead) {
            const currentConv = conversationsMap.get(contactId);
            if (!currentConv.newMessagesCount) {
              currentConv.newMessagesCount = 1;
            } else {
              currentConv.newMessagesCount += 1;
            }
            conversationsMap.set(contactId, currentConv);
          }
        }
      });

      const userList = [];
      for (let [userId, lastMessage] of conversationsMap) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const messagePrefix = lastMessage.senderId === currentUser.uid ? 'You: ' : `${userData.name}: `;

          // Vérifier si ce contact est un favori
          const favDoc = await getDoc(doc(favouriteRef, `${currentUser.uid}_${userId}`));
          const isFavourite = favDoc.exists() && favDoc.data().isMyFav;

          userList.push({
            _id: userId,
            ...userData,
            lastMessage: lastMessage.text ? messagePrefix + lastMessage.text : 'No message',
            lastMessageTime: lastMessage.createdAt,
            isFavourite: isFavourite,
            newMessagesCount: lastMessage.newMessagesCount || 0, // Nombre de messages non lus par conversation
          });
        }
      }

      // Tri par date de dernier message (antichronologique)
      userList.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      setConversations(userList);
      setLoading(false);
    });

    return () => unsubscribeMessages(); // Cleanup on unmount
  }, [currentUser]);

  // Fonction pour ajouter ou supprimer un favori
  const toggleFavourite = async (receiverId) => {
    const favDocRef = doc(db, 'favourite', `${currentUser.uid}_${receiverId}`);
    const favDoc = await getDoc(favDocRef);

    if (favDoc.exists()) {
      // Si la conversation est déjà dans les favoris, on la bascule
      await updateDoc(favDocRef, {
        isMyFav: !favDoc.data().isMyFav
      });
    } else {
      // Si elle n'est pas encore dans les favoris, on l'ajoute
      await setDoc(favDocRef, {
        senderId: currentUser.uid,
        receiverId: receiverId,
        isMyFav: true,
      });
    }

    // Mettre à jour l'interface
    setConversations((prevConversations) =>
      prevConversations.map((conv) =>
        conv._id === receiverId
          ? { ...conv, isFavourite: !conv.isFavourite }
          : conv
      )
    );
  };

  // Filtrer les conversations en fonction de l'état showFavorites et searchText
  const filteredConversations = showFavorites
    ? conversations.filter((conv) => conv.isFavourite) // Afficher uniquement les favoris
    : conversations;

  // Appliquer la recherche par nom (par ordre alphabétique)
  const searchedConversations = filteredConversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <FontAwesome5 name="search" size={18} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Conversations</Text>
        <TouchableOpacity
          style={styles.showFavoritesButton}
          onPress={() => setShowFavorites(!showFavorites)} // Bascule entre l'affichage des favoris et de toutes les conversations
        >
          <Text style={styles.showFavoritesText}>
            {showFavorites ? 'Show All' : 'Show Favourites'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={searchedConversations}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => {
              navigation.navigate('Chat', { user: item });
            }}
          >
            <View style={[styles.avatar, { backgroundColor: getRandomColor() }]}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{item.name}</Text>
              <Text
                style={[
                  styles.lastMessage,
                  item.newMessagesCount > 0 && { fontWeight: 'bold' }, // Message non lu en gras
                ]}
              >
                {item.lastMessage || 'No message'}
              </Text>
              {item.newMessagesCount > 0 && (
                <Text style={styles.newMessagesText}>
                  {item.newMessagesCount} new messages
                </Text>
              )}
              <Text style={styles.messageTime}>
                {new Date(item.lastMessageTime.seconds * 1000).toLocaleTimeString()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => toggleFavourite(item._id)}>
              <FontAwesome5
                name={item.isFavourite ? 'star' : 'star-half-alt'}
                size={20}
                color={item.isFavourite ? 'gold' : '#ccc'}
                solid // Pour forcer l'icône pleine (solid)
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// Fonction pour générer les initiales
const getInitials = (name) => {
  if (!name) return '';
  const words = name.split(' ');
  const initials = words.map((word) => word.charAt(0).toUpperCase());
  return initials.join('');
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  showFavoritesButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  showFavoritesText: {
    fontSize: 14,
    color: '#007bff',
  },
  newMessagesText: {
    fontSize: 12,
    color: 'red',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingBottom: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    height: 40,
    flex: 1,
    paddingLeft: 10,
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
});

export default MessagesScreen;
