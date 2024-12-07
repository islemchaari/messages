import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput } from 'react-native';
import { db, auth } from '../config/firebaseConfig';
import { collection, onSnapshot, getDoc, doc, updateDoc, query, where, getDocs } from '@firebase/firestore';
import { FontAwesome5 } from '@expo/vector-icons'; // Importer FontAwesome5

const MessagesScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // État pour la recherche
  const currentUser = auth.currentUser;

  useEffect(() => {
    const messagesRef = collection(db, 'messages');

    const unsubscribe = onSnapshot(messagesRef, async (snapshot) => {
      const conversationsMap = new Map();

      snapshot.docs.forEach((doc) => {
        const { senderId, receiverId, text, createdAt, isRead } = doc.data();

        if (senderId === currentUser.uid || receiverId === currentUser.uid) {
          const contactId = senderId !== currentUser.uid ? senderId : receiverId;

          // On garde le dernier message de la conversation et son statut 'isRead'
          if (!conversationsMap.has(contactId) || createdAt > conversationsMap.get(contactId).createdAt) {
            conversationsMap.set(contactId, { text, createdAt, senderId, receiverId, isRead });
          }
        }
      });

      const userList = [];
      for (let [userId, lastMessage] of conversationsMap) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const messagePrefix = lastMessage.senderId === currentUser.uid ? 'You: ' : `${userData.name}: `;

          // Comptage des messages non lus pour chaque utilisateur (uniquement pour les messages reçus)
          const unreadCount = lastMessage.senderId !== currentUser.uid ? await countUnreadMessages(userId) : 0;

          userList.push({
            _id: userId,
            ...userData,
            lastMessage: lastMessage.text ? messagePrefix + lastMessage.text : 'No message', // S'assurer que 'lastMessage' existe
            lastMessageTime: lastMessage.createdAt,
            isRead: lastMessage.isRead, // On conserve le statut du dernier message
            unreadCount, // On ajoute le nombre de messages non lus (uniquement reçus)
          });
        }
      }

      // Trier les conversations en fonction de 'lastMessageTime' (du plus récent au plus ancien)
      userList.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      setConversations(userList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fonction pour filtrer les conversations en fonction de la recherche
  const filteredConversations = conversations.filter((item) => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Fonction pour compter les messages non lus d'une conversation (uniquement pour les messages reçus)
  const countUnreadMessages = async (userId) => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('senderId', '==', userId), // Messages envoyés par l'autre utilisateur
      where('receiverId', '==', currentUser.uid), // Messages reçus par l'utilisateur actuel
      where('isRead', '==', false) // Filtrer les messages non lus
    );

    const snapshot = await getDocs(q);
    return snapshot.size; // Retourne le nombre de messages non lus reçus
  };

  // Fonction pour marquer les messages comme lus lorsque la conversation est ouverte
  const markMessagesAsRead = async (userId) => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('senderId', 'in', [currentUser.uid, userId]),
      where('receiverId', 'in', [currentUser.uid, userId])
    );

    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
      if (doc.exists()) {
        // Mettre à jour le champ isRead à true
        updateDoc(doc.ref, { isRead: true });
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <FontAwesome5 name="search" size={18} color="#ccc" style={styles.searchIcon} />
        <TextInput
          style={styles.searchBar}
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery} // Mettre à jour l'état de la recherche
        />
      </View>
      <Text style={styles.title}>Conversations</Text>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => {
              // Marquer les messages comme lus lorsque la conversation est ouverte
              markMessagesAsRead(item._id);
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
                  {
                    fontWeight:
                      item.isRead || item.unreadCount === 0 || item.lastMessage.startsWith('You: ')
                        ? 'normal'
                        : 'bold', // Ne mettre en gras que les messages non lus d'un autre utilisateur
                  },
                ]}
              >
                {item.lastMessage || 'No message'} {/* Valeur par défaut si lastMessage est undefined */}
              </Text>
              {item.unreadCount > 0 && item.lastMessage && item.lastMessage.senderId !== currentUser.uid && (
                <Text style={styles.unreadCount}>
                  {item.unreadCount} new{item.unreadCount > 1 ? 's' : ''} {/* Pluriel si plus d'un message */}
                </Text>
              )}
            </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
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
  unreadCount: {
    fontSize: 12,
    color: 'red',
    marginTop: 4,
  },
});

export default MessagesScreen;
