import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import { FontAwesome5 } from '@expo/vector-icons';
import { db, auth } from '../config/firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc } from '@firebase/firestore';
import * as Notifications from 'expo-notifications';  // Importer expo-notifications

const ChatScreen = ({ route, navigation }) => {
  const { user } = route.params;
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser || !user) return;

    const q = query(
      collection(db, 'messages'),
      where('receiverId', 'in', [currentUser.uid, user._id]),
      where('senderId', 'in', [currentUser.uid, user._id]),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      }));
      setMessages(messagesData);

      // Marquer comme lu les messages non lus lorsque l'utilisateur les ouvre
      snapshot.docs.forEach(async (doc) => {
        const messageData = doc.data();
        // Si le message est non lu et qu'il n'a pas été envoyé par l'utilisateur actuel
        if (!messageData.isRead && messageData.receiverId === currentUser.uid && messageData.senderId !== currentUser.uid) {
          await updateDoc(doc.ref, { isRead: true });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, user]);

  const getUserName = async (userId) => {
    const userDoc = doc(db, 'users', userId);
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      return docSnap.data().name;
    } else {
      return 'User';
    }
  };

  const handleSend = async (newMessages) => {
    const writes = newMessages.map(async (msg) => {
      const senderName = await getUserName(currentUser.uid);
      const messageRef = await addDoc(collection(db, 'messages'), {
        _id: msg._id,
        text: msg.text,
        createdAt: new Date(),
        senderId: currentUser.uid,
        receiverId: user._id,
        replyTo: replyTo ? { text: replyTo.text, userName: replyTo.user.name } : null,
        user: {
          _id: currentUser.uid,
          name: senderName,
        },
        isRead: false, // Le message est initialement non lu
      });

      // Envoi de la notification locale après avoir envoyé le message
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Nouveau message de ${senderName}`,
          body: msg.text,  // Affiche le texte du message dans la notification
        },
        trigger: null,  // La notification apparaîtra immédiatement
      });
    });

    setReplyTo(null); // Réinitialiser la barre de réponse
    await Promise.all(writes);
  };

  const handleReply = (message) => {
    setReplyTo(message); // Enregistrer le message auquel on répond
  };

  const renderReplyBar = () => {
    if (!replyTo) return null;

    return (
      <View style={styles.replyBar}>
        <View style={styles.replyPreview}>
          <Text style={styles.replyUserName}>
            Replying to: @{replyTo.user.name}
          </Text>
          <Text style={styles.replyText}>{replyTo.text}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setReplyTo(null)} // Fermer la barre de réponse
          style={styles.closeReplyButton}
        >
          <FontAwesome5 name="times" size={16} color="#000" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessageText = (props) => {
    const { currentMessage } = props;

    return (
      <View style={{ marginBottom: 10 }}>
        {currentMessage.replyTo && (
          <View style={styles.replyContainer}>
            <Text style={styles.replyUserName}>
              @{currentMessage.replyTo.userName}
            </Text>
            <Text style={styles.replyText}>{currentMessage.replyTo.text}</Text>
          </View>
        )}
        <Text style={styles.messageText}>{currentMessage.text}</Text>
      </View>
    );
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.arrowContainer}>
          <FontAwesome5 name="arrow-left" size={20} color="#000" />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <View style={[styles.bubble, { backgroundColor: getRandomColor() }]} >
            <Text style={styles.bubbleText}>
              {getInitials(user.name)}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
        </View>
      </View>

      {renderReplyBar()} {/* Affichage de la barre de réponse */}

      <GiftedChat
        messages={messages}
        onSend={(newMessages) => handleSend(newMessages)}
        user={{
          _id: currentUser.uid,
          name: currentUser.displayName || 'User',
        }}
        renderAvatar={(props) => {
          const { name } = props.currentMessage.user;
          const initials = getInitials(name);
          return (
            <View style={[styles.avatar, { backgroundColor: getRandomColor() }]} >
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          );
        }}
        renderMessageText={renderMessageText} // Personnaliser l'affichage des messages
        onLongPress={(context, message) => handleReply(message)} // Permettre la réponse par un appui long sur un message
      />

      {/* Barre inférieure */}
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingLeft: 10,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  arrowContainer: {
    marginRight: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  userName: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  bottomIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 12,
    marginTop: 5,
  },
  replyBar: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  replyPreview: {
    flex: 1,
  },
  replyUserName: {
    fontWeight: 'bold',
  },
  replyText: {
    color: '#777',
  },
  closeReplyButton: {
    marginLeft: 10,
  },
  replyContainer: {
    marginBottom: 5,
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderRadius: 5,
  },
  messageText: {
    fontSize: 16,
  },
});

export default ChatScreen;
