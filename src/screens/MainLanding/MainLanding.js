import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ImageBackground,
  Alert,
  ToastAndroid,
  Platform,
  Dimensions,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BottomTab, Slider } from "../../components";
import GoldPlan from "../../ui/ProductCard/GoldPlans";
import ProductCard from "../../ui/ProductCard/ProductCard";
import { SafeAreaView } from "react-native-safe-area-context";
import Footer from "../../components/Footer/Footer";
import styles from "./styles";
import { COLORS } from "../../utils/AppTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProductCardSkeleton from "../../components/SkeletonLoader/ProductCardSkeleton";
import GoldPlansSkeleton from "../../components/SkeletonLoader/GoldPlansSkeleton";
import MainPageWithYouTube from "../Youtube/Youtube";
import MainHeader from "../../components/MainHeader/MainHeader";
import { getPhoneDetails } from "../../services/SchemeDetailsService";
import { getUserData } from "../../utils/AsynchStorageHelper";
import { getAllSchemes } from "../../services/SchemeNameService";
import { recoverPendingPayments } from "../../services/PaymentRecoveryService";

import {
  registerForPushNotifications,
  listenForNotifications,
  removeNotificationListeners,
  sendLocalNotification,
} from "../../utils/Notification";
import { API_BASE_URL } from "../../Config/API";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BASE_URL = "https://scheme.bmgjewellers.com";

// Utility: toast
const showToast = (message) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("", message);
  }
};

// ------------------- SWIPEABLE CARDS COMPONENT -------------------
const SwipeableCards = React.memo(
  ({
    data,
    loading,
    error,
    renderItem,
    renderSkeleton,
    emptyMessage,
    cardWidth = SCREEN_WIDTH - 40,
  }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const listRef = useRef(null);

    const onMomentumScrollEnd = useCallback(
      (event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / cardWidth);
        setCurrentIndex(index);
      },
      [cardWidth]
    );

    const getItemLayout = useCallback(
      (_data, index) => ({
        length: cardWidth,
        offset: cardWidth * index,
        index,
      }),
      [cardWidth]
    );

    const skeletonData = useMemo(
      () => Array.from({ length: 3 }, (_, index) => ({ id: index })),
      []
    );

    if (loading) {
      return (
        <View style={styles.swipeableContainer}>
          <FlatList
            ref={listRef}
            data={skeletonData}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            renderItem={({ item, index }) => (
              <View style={[styles.cardWrapper, { width: cardWidth }]}>
                {renderSkeleton ? (
                  renderSkeleton(index)
                ) : (
                  <View style={styles.skeletonPlaceholder}>
                    <Text>Loading...</Text>
                  </View>
                )}
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            decelerationRate="fast"
            snapToInterval={cardWidth}
            snapToAlignment="center"
            getItemLayout={getItemLayout}
          />
        </View>
      );
    }

    if (error || !data || data.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>
            {error || emptyMessage || "No data available"}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.swipeableContainer}>
        <FlatList
          ref={listRef}
          data={data}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item, index }) => (
            <View style={[styles.cardWrapper, { width: cardWidth }]}>
              {renderItem(item, index)}
            </View>
          )}
          keyExtractor={(item, index) =>
            item.regNo && item.groupCode
              ? `${item.regNo}-${item.groupCode}-${index}`
              : item.schemeId
              ? `${item.schemeId}-${index}`
              : index.toString()
          }
          decelerationRate="fast"
          snapToInterval={cardWidth}
          snapToAlignment="center"
          contentContainerStyle={styles.flatListContent}
          getItemLayout={getItemLayout}
        />
        {data.length > 1 && (
          <View style={styles.paginationContainer}>
            {data.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      index === currentIndex
                        ? COLORS.primary
                        : COLORS.textDisabled,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  }
);

// ------------------- SECTION HEADER -------------------
const SectionHeader = React.memo(({ title, onViewAll }) => (
  <View style={styles.sectionHeaderContainer}>
    <Text style={styles.titleText}>{title}</Text>
    <TouchableOpacity onPress={onViewAll}>
      <Text style={styles.viewAllText}>View All</Text>
    </TouchableOpacity>
  </View>
));

// ------------------- MAIN LANDING -------------------
function MainLanding() {
  const navigation = useNavigation();

  const [schemes, setSchemes] = useState([]);
  const [schemeRules, setSchemeRules] = useState({});
  const [productData, setProductData] = useState([]);
  const [productLoading, setProductLoading] = useState(true);
  const [schemesLoading, setSchemesLoading] = useState(true);
  const [schemesError, setSchemesError] = useState(null);
  const [productError, setProductError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track notification initialization
  const notificationInitializedRef = useRef(false);

  // Function to fetch remaining days for a scheme
  const fetchRemainingDays = useCallback(async (schemeId, joinDate) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/scheme-bonus/all_remainingDays?schemeId=${schemeId}&joinDate=${joinDate}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.remainingDays || 0;
    } catch (error) {
      console.error("Error fetching remaining days:", error);
      return 0; // Return 0 if there's an error
    }
  }, []);

  // -------------------- Notifications --------------------
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");

        // This will automatically handle the welcome notification
        const token = await registerForPushNotifications(userId, {
          showWelcomeNotification: true,
          welcomeTitle: "🎉 Welcome!",
          welcomeBody: "Check out the latest schemes now.",
          welcomeImage:
            "https://tse4.mm.bing.net/th/id/OIP.DeQ9K0_r5lXfh77zACJctQHaEo?rs=1&pid=ImgDetMain&o=7&rm=3",
        });

        if (!token) {
        } else {
        }

        const listeners = listenForNotifications();
        return () => removeNotificationListeners(listeners);
      } catch (err) {
        console.error("Error initializing notifications:", err);
      }
    };

    initNotifications();
  }, []);
  // -------------------- End Notifications --------------------

  // Fetch all scheme rules from API
  const fetchSchemeRules = useCallback(async () => {
    try {
      const allSchemes = await getAllSchemes();
      const rulesMap = {};

      allSchemes.forEach((scheme) => {
        rulesMap[scheme.schemeName?.trim()] = {
          WeightLedger: scheme.WeightLedger,
          FixedIns: scheme.FixedIns,
          Instalment: scheme.Instalment,
        };
      });

      setSchemeRules(rulesMap);
      return rulesMap;
    } catch (err) {
      console.error("Error fetching scheme rules:", err);
      return {};
    }
  }, []);

  const fetchSchemes = useCallback(async () => {
    setSchemesLoading(true);
    setSchemesError(null);

    try {
      const result = await getAllSchemes();

      if (!result?.length) {
        return setSchemesError("No saving schemes found");
      }

      setSchemes(result);
    } catch {
      setSchemesError("Failed to load saving schemes");
    } finally {
      setSchemesLoading(false);
    }
  }, []);

  const fetchProductData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setProductLoading(true);
      }

      try {
        // Fetch scheme rules first
        const rules = await fetchSchemeRules();

        const user = await getUserData();

        if (!user) {
          setProductError("Please complete your registration to view schemes");
          setProductData([]);
          return;
        }

        const storedPhone = user.contactNumber || user.phoneNumber;

        if (!storedPhone) {
          setProductError("Please complete your registration to view schemes");
          setProductData([]);
          return;
        }

        const accounts = await getPhoneDetails(storedPhone);

        if (!accounts || accounts.length === 0) {
          setProductError("No Schemes available for this account");
          setProductData([]);
          return;
        }

        // Process product data with scheme rules
        const processedPromises = accounts.map(async (item) => {
          const schemeName = item.schemeSummary?.schemeName?.trim();
          const schemeRule = rules[schemeName] || {};

          // Determine scheme type based on API rules
          const isWeightScheme = schemeRule.WeightLedger === "Y";
          const isAmountScheme =
            schemeRule.FixedIns === "Y" && schemeRule.WeightLedger !== "Y";
          const isFixedDeposit =
            schemeRule.FixedIns !== "Y" &&
            schemeRule.WeightLedger !== "Y" &&
            parseInt(schemeRule.Instalment) === 1;
          const isDigitalScheme =
            schemeRule.FixedIns !== "Y" &&
            schemeRule.WeightLedger !== "Y" &&
            parseInt(schemeRule.Instalment) > 1;

          // Calculate payment history
          const totalInstalments = parseInt(
            schemeRule.Instalment || item.schemeSummary?.instalment || 0
          );
          const insPaid = item.paymentHistoryList?.length || 0;
          const amtrecd =
            item.paymentHistoryList?.reduce(
              (sum, entry) => sum + Number(entry.amount || 0),
              0
            ) || 0;

          // Fetch remaining days from API
          let remainingDays = 0;
          const schemeId = item.schemeSummary?.schemeId;
          const joinDate = item.schemeSummary?.joinDate || item.joinDate;

          if (schemeId && joinDate) {
            // Format joinDate if needed (YYYY-MM-DD format)
            const formattedJoinDate = joinDate.split('T')[0]; // Remove time part if exists
            remainingDays = await fetchRemainingDays(schemeId, formattedJoinDate);
          }

          return {
            ...item,
            status: "Active",
            regno: item.regNo,
            groupcode: item.groupCode,
            pname: item.pname || item.personalInfo?.pName,
            remainingDays: remainingDays, // Use the fetched remaining days

            // Enhanced scheme summary with API rules
            schemeSummary: {
              ...item.schemeSummary,
              WeightLedger:
                schemeRule.WeightLedger || item.schemeSummary?.WeightLedger,
              FixedIns: schemeRule.FixedIns || item.schemeSummary?.FixedIns,
              Instalment:
                schemeRule.Instalment || item.schemeSummary?.instalment,
              schemeType: {
                isWeightScheme,
                isAmountScheme,
                isFixedDeposit,
                isDigitalScheme,
              },
            },

            // Transaction balance
            schemaSummaryTransBalance: {
              insPaid: insPaid,
              amtrecd: amtrecd,
            },
          };
        });

        // Wait for all remaining days to be fetched
        const processed = await Promise.all(processedPromises);


        setProductData(processed);
      } catch (err) {
        console.error("Error in fetchProductData:", err);
        setProductError("Failed to fetch schemes data");
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        } else {
          setProductLoading(false);
          setInitialLoad(false);
        }
      }
    },
    [fetchSchemeRules, fetchRemainingDays]
  );

  // Initial load
  useEffect(() => {
    fetchProductData(false);
    fetchSchemes();
  }, []);

  // Recover payments interrupted mid-flow (app closed during payment,
  // credit insert failed after a confirmed payment, etc.).
  useEffect(() => {
    const runRecovery = async () => {
      try {
        const { recovered } = await recoverPendingPayments();
        if (recovered.length > 0) {
          const joins = recovered.filter((r) => r.type === "join").length;
          const installments = recovered.length - joins;
          const parts = [];
          if (joins) parts.push(`${joins} scheme enrollment${joins > 1 ? "s" : ""}`);
          if (installments)
            parts.push(`${installments} installment payment${installments > 1 ? "s" : ""}`);
          Alert.alert(
            "Payment Completed",
            `Good news — we finished processing ${parts.join(" and ")} from your earlier payment${recovered.length > 1 ? "s" : ""}.`
          );
          // Refresh dashboard data so the recovered payments are visible
          fetchProductData(true);
        }
      } catch (e) {
        console.warn("Payment recovery check failed:", e.message);
      }
    };
    runRecovery();
  }, []);

  // useFocusEffect to refresh when screen focused
  useFocusEffect(
    useCallback(() => {
      if (!initialLoad) {
        fetchProductData(true);
      }
    }, [initialLoad, fetchProductData])
  );

  const handlePayNow = useCallback(
    (item) => {
      navigation.navigate("Buy", {
        productData: item,
        paymentData: {
          regNo: item.regNo,
          groupCode: item.groupCode,
          customerName: item.pname,
          amount: item.amount,
          schemeName: item.schemeSummary?.schemeName,
          schemes: schemes,
        },
      });
    },
    [navigation, schemes]
  );

  const renderProductCard = useCallback(
    (item) => {

      return (
        <View style={styles.productCardContainer}>
          <ProductCard
            productData={item}
            navigation={navigation}
            onPress={() => {}}
            onPayNow={() => handlePayNow(item)}
            remainingDate={item.remainingDays || 0} // Pass remaining days to ProductCard
          />
        </View>
      );
    },
    [navigation, handlePayNow]
  );

  // Memoized header component
  const HeaderComponent = useMemo(
    () => (
      <MainLandingHeader
        navigation={navigation}
        productData={productData}
        productLoading={initialLoad ? productLoading : false}
        productError={productError}
        schemes={schemes}
        schemesLoading={schemesLoading}
        schemesError={schemesError}
        renderProductCard={renderProductCard}
      />
    ),
    [
      navigation,
      productData,
      initialLoad,
      productLoading,
      productError,
      schemes,
      schemesLoading,
      schemesError,
      renderProductCard,
    ]
  );

  return (
    <View style={[styles.flex, styles.safeAreaStyle]}>
      <ImageBackground
        source={require("../../assets/image.png")}
        style={styles.mainBackground}
        imageStyle={styles.backgroundImageStyle}
      >
        <SafeAreaView style={styles.safeArea}>
          <FlatList
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={HeaderComponent}
            data={[]}
            renderItem={null}
            ListFooterComponent={<View style={styles.footerSpacer} />}
          />
        </SafeAreaView>
      </ImageBackground>

      <BottomTab screen="HOME" />
    </View>
  );
}

const MainLandingHeader = React.memo(function MainLandingHeader({
  navigation,
  productData,
  productLoading,
  productError,
  schemes,
  schemesLoading,
  schemesError,
  renderProductCard,
}) {
  const renderSchemeItem = useCallback(
    (scheme) => (
      <View style={styles.goldPlanContainer}>
        <GoldPlan
          key={scheme.SchemeId}
          schemeId={scheme.SchemeId}
          schemeName={scheme.schemeName}
          schemeImage={
            scheme.image_path ? `${BASE_URL}${scheme.image_path}` : null
          }
          description={scheme.description || ""}
        />
      </View>
    ),
    []
  );

  return (
    <View style={{ gap: 16 }}>
      <MainHeader />
      <Slider />

      <View style={styles.titleSpacer}>
        <SectionHeader
          title="My Schemes"
          onViewAll={() => navigation.navigate("MyScheme")}
        />
        <SwipeableCards
          data={productData}
          loading={productLoading}
          error={productError}
          emptyMessage="No Schemes available"
          renderItem={renderProductCard}
          renderSkeleton={(index) => <ProductCardSkeleton key={index} />}
          cardWidth={SCREEN_WIDTH - 40}
        />
      </View>

      <View style={[styles.titleSpacer, { flex: 1 }]}>
        <SectionHeader
          title="Join Schemes"
          onViewAll={() => navigation.navigate("GoldPlanScreen")}
        />
        <SwipeableCards
          data={schemes}
          loading={schemesLoading}
          error={schemesError}
          emptyMessage="No saving schemes available"
          renderItem={renderSchemeItem}
          renderSkeleton={(index) => <GoldPlansSkeleton key={index} />}
          cardWidth={SCREEN_WIDTH * 0.9}
        />
      </View>

      <View style={styles.youtubeContainer}>
        <View style={styles.youtubeWrapper}>
          <Text style={styles.titleText}>Promotions & Offers</Text>
        </View>
        <MainPageWithYouTube />
      </View>
      <Footer />
    </View>
  );
});

export default MainLanding;