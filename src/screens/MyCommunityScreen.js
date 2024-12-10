import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { getAuth } from "firebase/auth";
import { db } from '../config/firebaseConfig';
import { collection, query, where, getDocs, updateDoc, setDoc, doc } from "firebase/firestore";

const MyCommunityScreen = () => {
  const [users, setUsers] = useState([]); 
  const [followingStatus, setFollowingStatus] = useState({}); 
  const [selectedTab, setSelectedTab] = useState('peopleIFollow'); 
  const [loading, setLoading] = useState(false); 
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // Function to fetch the list of users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true); 
      try {
        const usersCollection = collection(db, "users");
        const q = query(usersCollection);
        const querySnapshot = await getDocs(q);

        const usersList = [];
        const followingState = {};

        querySnapshot.forEach((doc) => {
          if (doc.id !== currentUser?.uid) { 
            usersList.push({ id: doc.id, ...doc.data() });
            followingState[doc.id] = false;
          }
        });

        const followersRef = collection(db, "followers");
        const followQuery = query(followersRef, where("followerID", "==", currentUser?.uid), where("following", "==", true));
        const followSnapshot = await getDocs(followQuery);

        const followedUsers = [];
        followSnapshot.forEach((doc) => {
          followedUsers.push(doc.data().followedID);
        });

        const followerQuery = query(followersRef, where("followedID", "==", currentUser?.uid), where("following", "==", true));
        const followerSnapshot = await getDocs(followerQuery);

        const followersUsers = [];
        followerSnapshot.forEach((doc) => {
          followersUsers.push(doc.data().followerID);
        });

        setUsers(usersList);
        setFollowingStatus((prevState) => ({
          ...prevState,
          followedUsers,
          followersUsers
        }));
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  const handleFollow = async (followedID) => {
    setLoading(true);
    try {
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to follow someone!");
        return;
      }

      const followersRef = collection(db, "followers");
      const docID = `${currentUser.uid}_${followedID}`;
      const docRef = doc(followersRef, docID);

      const querySnapshot = await getDocs(
        query(followersRef, where("followerID", "==", currentUser.uid), where("followedID", "==", followedID))
      );

      if (!querySnapshot.empty) {
        await updateDoc(docRef, { following: true });
      } else {
        await setDoc(docRef, { followerID: currentUser.uid, followedID, following: true });
      }

      setFollowingStatus((prev) => ({ ...prev, [followedID]: true }));
      Alert.alert("Success", "User followed successfully!");
    } catch (error) {
      console.error("Error following user:", error);
      Alert.alert("Error", "Unable to follow this user.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (followedID) => {
    setLoading(true);
    try {
      if (!currentUser) {
        Alert.alert("Error", "You must be logged in to unfollow someone!");
        return;
      }

      const followersRef = collection(db, "followers");
      const docID = `${currentUser.uid}_${followedID}`;
      const docRef = doc(followersRef, docID);

      const querySnapshot = await getDocs(
        query(followersRef, where("followerID", "==", currentUser.uid), where("followedID", "==", followedID))
      );

      if (!querySnapshot.empty) {
        await updateDoc(docRef, { following: false });

        setFollowingStatus((prev) => ({ ...prev, [followedID]: false }));
        Alert.alert("Success", "You have unfollowed the user successfully!");
      } else {
        Alert.alert("Error", "Follow relationship not found!");
      }
    } catch (error) {
      console.error("Error unfollowing user:", error);
      Alert.alert("Error", "Unable to unfollow this user.");
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }) => {
    const isFollowing = followingStatus.followedUsers?.includes(item.id);
    const isFollower = followingStatus.followersUsers?.includes(item.id);

    return (
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <Text style={styles.userName}>{item.name}</Text>
        <View style={styles.buttonsContainer}>
          {!isFollowing && isFollower && (
            <TouchableOpacity style={[styles.followButton, styles.hoverEffect]} onPress={() => handleFollow(item.id)}>
              <Text style={styles.followText}>Follow Back</Text>
            </TouchableOpacity>
          )}
          {!isFollowing && !isFollower && (
            <TouchableOpacity style={[styles.followButton, styles.hoverEffect]} onPress={() => handleFollow(item.id)}>
              <Text style={styles.followText}>Follow</Text>
            </TouchableOpacity>
          )}
          {isFollowing && (
            <TouchableOpacity style={[styles.disabledButton, styles.hoverEffect]} disabled={true}>
              <Text style={styles.followingText}>Following</Text>
            </TouchableOpacity>
          )}
          {isFollowing && (
            <TouchableOpacity style={[styles.unfollowButton, styles.hoverEffect]} onPress={() => handleUnfollow(item.id)}>
              <Text style={styles.unfollowText}>Unfollow</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Community</Text>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'peopleIFollow' && styles.activeTab]}
          onPress={() => setSelectedTab('peopleIFollow')}
        >
          <Text style={[styles.tabText, selectedTab === 'peopleIFollow' && styles.activeTabText]}>People I Follow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'followers' && styles.activeTab]}
          onPress={() => setSelectedTab('followers')}
        >
          <Text style={[styles.tabText, selectedTab === 'followers' && styles.activeTabText]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'followSuggestions' && styles.activeTab]}
          onPress={() => setSelectedTab('followSuggestions')}
        >
          <Text style={[styles.tabText, selectedTab === 'followSuggestions' && styles.activeTabText]}>Follow Suggestions</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <FlatList
          data={users.filter(user => {
            if (selectedTab === 'peopleIFollow') {
              return followingStatus.followedUsers?.includes(user.id);
            } else if (selectedTab === 'followers') {
              return followingStatus.followersUsers?.includes(user.id);
            } else if (selectedTab === 'followSuggestions') {
              return !followingStatus.followedUsers?.includes(user.id);
            }
            return true;
          })}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f6f9',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    alignItems: 'center',
    width: '28%',
  },
  activeTab: {
    backgroundColor: '#007bff',
    shadowColor: '#007bff',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  activeTabText: {
    color: '#fff',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    backgroundColor: '#007bff',
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 5,
  },
  followingText: {
    color: '#fff',
    fontSize: 14,
  },
  followText: {
    color: '#fff',
    fontSize: 14,
  },
  unfollowButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 5,
  },
  unfollowText: {
    color: '#fff',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 5,
  },
  hoverEffect: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default MyCommunityScreen;
