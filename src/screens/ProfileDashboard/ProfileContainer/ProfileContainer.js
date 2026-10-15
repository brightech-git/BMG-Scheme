import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  ImageBackground,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import styles from './styles';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TextDefault } from '../../../components';
import { colors } from '../../../utils';
import { colors1 } from '../../../utils/colors';
import { API_BASE_URL_OLD } from '../../../Config/API';
import { logoutUser } from '../../../utils/AsynchStorageHelper';

function ProfileContainer(props) {
  const navigation = useNavigation();
  const [userPhone, setUserPhone] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const phoneNumber = await AsyncStorage.getItem('userPhoneNumber');
        if (phoneNumber) {
          // Format the phone number for display
          const formattedPhone = phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
          setUserPhone(formattedPhone);

          // Fetch user details using phone number
          const response = await fetch(`${API_BASE_URL_OLD}/account/phonesearch?phoneNo=${phoneNumber}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              setUserName(data[0].pname || 'User');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await logoutUser();
            } catch (error) {
              console.error('Error during logout:', error);
            } finally {
              navigation.replace('LoginPage');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* <StatusBar backgroundColor={colors1.primary} barStyle="light-content" /> */}
      {/* <ImageBackground 
        source={require('../../../assets/gold.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      > */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors1.primaryText} />
          </TouchableOpacity>

          {/* Profile Header with Gradient */}
          <LinearGradient
            colors={colors1.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileHeader}
          >
            <View style={styles.profileSection}>
              <View style={styles.profileIconContainer}>
                <LinearGradient
                  colors={['#FFD700', '#d43737ff']}
                  style={styles.profileIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name="account-circle" size={80} color={colors1.textLight} />
                </LinearGradient>
              </View>
              <TextDefault style={styles.profileName} H4>
                {userName}
              </TextDefault>
              <View style={styles.phoneContainer}>
                <Feather name="phone" size={20} color={colors1.textLight} style={styles.phoneIcon} />
                <TextDefault style={styles.phoneNumber} H5>
                  {userPhone}
                </TextDefault>
              </View>
            </View>
          </LinearGradient>

          {/* Settings Options Card */}
          <View style={styles.settingsCard}>
            <TextDefault style={styles.settingsTitle} H4>
              Account Settings
            </TextDefault>

            {[ 
              { label: 'My Scheme', icon: 'list', route: 'MyScheme' },
              { label: 'Help Center', icon: 'help-center', route: 'HelpCenter' },
              { label: 'Privacy Policy', icon: 'privacy-tip', route: 'PrivacyPolicy' },
              { label: 'Terms and Conditions', icon: 'description', route: 'TermsandCondition' },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settingsItem}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={styles.settingsIconContainer}>
                    <MaterialIcons name={item.icon} size={22} color={colors1.primary} />
                  </View>
                  <TextDefault style={styles.settingsItemText} H5>
                    {item.label}
                  </TextDefault>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors1.primary}
                />
              </TouchableOpacity>
            ))}

            {/* Logout Option */}
            <TouchableOpacity
              style={[styles.settingsItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, styles.logoutIconContainer]}>
                  <MaterialIcons name="logout" size={22} color={colors1.error} />
                </View>
                <TextDefault style={[styles.settingsItemText, styles.logoutText]} H5>
                  Log Out
                </TextDefault>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors1.error}
              />
            </TouchableOpacity>
          </View>

          {/* App Version */}
          <View style={styles.versionContainer}>
            <TextDefault style={styles.versionText} H6>
              Version 1.0.0
            </TextDefault>
          </View>
        </ScrollView>
      {/* </ImageBackground> */}
    </SafeAreaView>
  );
}

export default ProfileContainer;