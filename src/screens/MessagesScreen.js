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

  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const favouriteRef = collection(db, 'favourite');
    
    const unsubscribeMessages = onSnapshot(messagesRef, async (snapshot) => {
      const conversationsMap = new Map();
    
      snapshot.docs.forEach((doc) => {
        const { senderId, receiverId, text, createdAt, isRead } = doc.data();
    
        if (senderId === currentUser.uid || receiverId === currentUser.uid) {
          const contactId = senderId !== currentUser.uid ? senderId : receiverId;

          if (!conversationsMap.has(contactId)) {
            conversationsMap.set(contactId, {
              text,
              createdAt,
              senderId,
              receiverId,
              isRead,
              newMessagesCount: 0, 
            });
          }
    
          const currentConv = conversationsMap.get(contactId);
          
          if (receiverId === currentUser.uid && !isRead) {
            currentConv.newMessagesCount += 1;
          }

          if (createdAt > currentConv.createdAt) {
            currentConv.text = text;
            currentConv.createdAt = createdAt;
          }
    
          conversationsMap.set(contactId, currentConv);
        }
      });
    
      const userList = [];
      for (let [userId, lastMessage] of conversationsMap) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const messagePrefix = lastMessage.senderId === currentUser.uid ? 'You: ' : `${userData.name}: `;
    
          const favDoc = await getDoc(doc(favouriteRef, `${currentUser.uid}_${userId}`));
          const isFavourite = favDoc.exists() && favDoc.data().isMyFav;
    
          userList.push({
            _id: userId,
            ...userData,
            lastMessage: lastMessage.text ? messagePrefix + lastMessage.text : 'No message',
            lastMessageTime: lastMessage.createdAt,
            isFavourite: isFavourite,
            newMessagesCount: lastMessage.newMessagesCount || 0,
          });
        }
      }
    
      userList.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    
      setConversations(userList);
      setLoading(false);
    });
  
    return () => unsubscribeMessages();
  }, [currentUser]);

  const toggleFavourite = async (receiverId) => {
    const favDocRef = doc(db, 'favourite', `${currentUser.uid}_${receiverId}`);
    const favDoc = await getDoc(favDocRef);

    if (favDoc.exists()) {
      await updateDoc(favDocRef, {
        isMyFav: !favDoc.data().isMyFav
      });
    } else {
      await setDoc(favDocRef, {
        senderId: currentUser.uid,
        receiverId: receiverId,
        isMyFav: true,
      });
    }

    setConversations((prevConversations) =>
      prevConversations.map((conv) =>
        conv._id === receiverId
          ? { ...conv, isFavourite: !conv.isFavourite }
          : conv
      )
    );
  };

  const filteredConversations = showFavorites
    ? conversations.filter((conv) => conv.isFavourite)
    : conversations;

  const searchedConversations = filteredConversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <FontAwesome5 name="search" size={20} color="#888" style={styles.searchIcon} />
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
          onPress={() => setShowFavorites(!showFavorites)}
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
            <View style={styles.conversationDetails}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text
                style={[
                  styles.lastMessage,
                  item.newMessagesCount > 0 && { fontWeight: 'bold' },
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
                {formatDate(item.lastMessageTime.seconds * 1000)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => toggleFavourite(item._id)}>
              <FontAwesome5
                name={item.isFavourite ? 'star' : 'star-half-alt'}
                size={22}
                color={item.isFavourite ? '#FFD700' : '#ccc'}
                solid
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// Formatage de la date
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  const day = date.toLocaleDateString('fr-FR', options); // Jour et mois
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Heure sans secondes
  return `${day}, ${time}`;
};

const getInitials = (name) => {
  if (!name) return '';
  const words = name.split(' ');
  const initials = words.map((word) => word.charAt(0).toUpperCase());
  return initials.join('');
};

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
    backgroundColor: '#f4f7fc',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  showFavoritesButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1E90FF',
    borderRadius: 25,
  },
  showFavoritesText: {
    fontSize: 14,
    color: '#fff',
  },
  newMessagesText: {
    fontSize: 12,
    color: '#FF6347',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    height: 40,
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lastMessage: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  conversationDetails: {
    flex: 1,
  },
});

export default MessagesScreen;
