import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';

const Page2 = ({ navigation }) => {


  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
      }}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* Header Section */}
      <View
        style={{
          width: '100%',
          height: 47,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      ></View>

      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <Text
          style={{
            fontSize: 40,
            fontFamily: 'Montserrat',
            fontWeight: '700',
            color: '#4E5D78',
          }}
        >
          Page deux
        </Text>
        </View>
    </ScrollView>
  );
};

export default Page2;
