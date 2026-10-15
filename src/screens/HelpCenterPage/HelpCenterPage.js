import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ImageBackground,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../../utils/AppTheme";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { BottomTab } from "../../components";
import { useNavigation } from "@react-navigation/native";
import { companyDetails } from "../../services/CompanyDetails";

const { COLORS, SIZES, FONTS, verticalScale, moderateScale, SHADOWS } = theme;
// const SUPPORT_NUMBER = '70946 70946'

function HelpCenterPage() {
  const navigation = useNavigation();

  const [companyInfo, setCompanyInfo] = React.useState(null);

  // const [clickOpen , setClickOpen] = React.useState(false);
  // const [openedType, setOpenedType] = React.useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await companyDetails.getCompanyDetails();
        setCompanyInfo(data?.message?.[0]);
      } catch (error) {
        console.error("Error fetching company details:", error);
      }
    })();
  }, []);
  const cleanPhoneNumber = (phoneNumber) => {
    return phoneNumber.replace(/\D/g, "");
  };

  const handlePhoneCall = async (phoneNumber) => {
    const cleaned = cleanPhoneNumber(phoneNumber);
    const url = `tel:${cleaned}`;
    await Linking.openURL(url);
  };

  const handleEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleOpenMap = (address) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
    Linking.openURL(url);
  };

  const handleWhatsApp = (message) => {
    const url = `https://wa.me/${companyInfo?.cPhone}?text=${encodeURIComponent(
      message
    )}`;
    Linking.openURL(url).catch(() => {
      alert("Make sure WhatsApp is installed");
    });
  };

  const ContactCard = ({ icon, title, children, iconBg }) => (
    <LinearGradient
      colors={[COLORS.background, COLORS.backgroundSecondary]}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={moderateScale(20)} color={COLORS.white} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </LinearGradient>
  );

  const ContactItem = ({ text, icon, onPress, isAddress = false }) => (
    <TouchableOpacity style={styles.contactItem} onPress={onPress}>
      {isAddress ? (
        <View style={styles.addressContainer}>
          <Text style={styles.contactText}>{companyInfo?.cAddress1}</Text>
          <Text style={styles.contactText}>{companyInfo?.cAddress2}</Text>
          <Text style={styles.contactText}>{companyInfo?.cPincode}</Text>
        </View>
      ) : (
        <Text style={styles.contactText}>{text}</Text>
      )}
      <Icon name={icon} size={moderateScale(18)} color={COLORS.primary} />
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, text, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Icon name={icon} size={moderateScale(20)} color={COLORS.white} />
      <Text style={styles.actionText}>{text}</Text>
    </TouchableOpacity>
  );
  const getFullAddress = (info) => {
    const line1 = companyInfo?.cAddress1 || "";
    const line2 = companyInfo?.cAddress2 || "";
    const pin = companyInfo?.cPincode || "";

    return `${line1}, ${line2}, ${pin}`;
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/image.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <CommonHeader title="Help Center" subtitle="We're here to help you" />

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Contact Cards */}
          <View style={styles.quickContainer}>
            {/* Row 1 */}
            <View style={styles.quickContainerRow}>
              <QuickAction
                icon="chat"
                text="Live Chat"
                onPress={() =>
                  handleWhatsApp("Hello! I need help via Live Chat.")
                }
              />
              <QuickAction
                icon="location-on"
                text="Location"
                onPress={() => handleOpenMap(getFullAddress())}
              />
            </View>

            {/* Row 2 */}
            <View style={styles.quickContainerRow}>
              <QuickAction
                icon="mail"
                text="Send Email"
                onPress={() => navigation.navigate("EmailFormPage")}
              />

              <QuickAction
                icon="call"
                text="Call Support"
                onPress={() => handlePhoneCall(companyInfo?.cPhone)}
              />
            </View>

            {/* Row 3 */}
            {/* <View style={styles.quickContainerRow}>


            </View> */}
          </View>

          {/* <View style={styles.cardsContainer}>
            <ContactCard 
              icon="phone" 
              title="Phone Numbers" 
              iconBg={COLORS.primary}
            >

              <ContactItem
                text={companyInfo?.cPhone}
                icon="call"
                onPress={() => handlePhoneCall(companyInfo?.cPhone)}
              />
              <ContactItem
                text={companyInfo?.cPhone}
                icon="call"
                onPress={() => handlePhoneCall(companyInfo?.cPhone)}
              />
            </ContactCard>

            <ContactCard 
              icon="email" 
              title="Email Address" 
              iconBg={COLORS.primary}
            >
              <ContactItem
                text={companyInfo?.cEmail}
                icon="mail-outline"
                onPress={() => handleEmail(companyInfo?.cEmail)}
              />
            </ContactCard>

            <ContactCard 
              icon="location-on" 
              title="Office Address" 
              iconBg={COLORS.primary}
            >
              <ContactItem
                icon="place"
                onPress={handleOpenMap}
                isAddress={true}
              />
            </ContactCard>
          </View> */}

          {/* Support Hours */}
          <View style={styles.hoursContainer}>
            <Text style={styles.hoursTitle}>Customer Support Hours</Text>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>Monday - Saturday</Text>
              <Text style={styles.hoursTime}>10:00 AM - 6:00 PM</Text>
            </View>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>Sunday</Text>
              <Text style={styles.hoursTime}>11:00 AM - 4:00 PM</Text>
            </View>
          </View>

          {/* Quick Actions */}
          {/* <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <QuickAction
                icon="chat"
                text="Live Chat"
                onPress={() => handleWhatsApp('Hello! I need help via Live Chat.')}
              />
              <QuickAction
                icon="help-outline"
                text="FAQs"
                onPress={() => navigation.navigate('FAQPage')}
              />
              <QuickAction
                icon="description"
                text="Contact Support"
                onPress={() => handlePhoneCall(companyInfo.cPhone)}
              />

            </View>
          </View> */}
        </ScrollView>
        <BottomTab screen="HelpCenter" />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: SIZES.padding.md,
    paddingBottom: verticalScale(SIZES.padding.xl),
  },
  cardsContainer: {
    paddingHorizontal: SIZES.padding.lg,
    marginBottom: verticalScale(SIZES.padding.xl),
  },
  card: {
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.lg,
    marginBottom: verticalScale(SIZES.padding.md),
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(SIZES.padding.md),
  },
  iconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: SIZES.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.padding.md,
    ...SHADOWS.sm,
  },
  cardTitle: {
    ...FONTS.h5,
    color: COLORS.textPrimary,
  },
  contactItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: verticalScale(SIZES.padding.sm),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  contactText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SIZES.padding.sm,
  },
  addressContainer: {
    flex: 1,
  },
  hoursContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.xl,
    marginHorizontal: SIZES.padding.lg,
    marginBottom: verticalScale(SIZES.padding.xl),
    ...SHADOWS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  hoursTitle: {
    ...FONTS.h5,
    color: COLORS.textPrimary,
    marginBottom: verticalScale(SIZES.padding.md),
    textAlign: "center",
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: verticalScale(SIZES.padding.sm),
  },
  hoursDay: {
    ...FONTS.body,
    color: COLORS.textPrimary,
  },
  hoursTime: {
    ...FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  actionsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.xl,
    marginHorizontal: SIZES.padding.lg,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actionsTitle: {
    ...FONTS.h5,
    color: COLORS.textPrimary,
    marginBottom: verticalScale(SIZES.padding.md),
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SIZES.padding.sm,
  },
  actionButton: {
    alignItems: "center",
    padding: SIZES.padding.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radius.md,
    flex: 1,
    minHeight: verticalScale(80),
    justifyContent: "center",
    ...SHADOWS.sm,
  },
  actionText: {
    ...FONTS.bodyMedium,
    color: COLORS.white,
    marginTop: verticalScale(SIZES.xs),
    textAlign: "center",
  },
  quickContainer: {
    padding: 15,
  },
  quickContainerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 15,
  },
});

export default HelpCenterPage;
