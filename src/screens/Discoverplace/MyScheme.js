import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  ImageBackground,
  StyleSheet,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./styles";
import BottomTab from "../../components/BottomTab/BottomTab";
import { TextDefault } from "../../components";
import ProductCard from "../../ui/ProductCard/ProductCard";
import ProductCardSkeleton from "../../components/SkeletonLoader/ProductCardSkeleton";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { getPhoneDetails } from "../../services/SchemeDetailsService";
import { getAllSchemes } from "../../services/SchemeNameService";
import { getRemainingDaysData } from "../../services/Remainingdays"; // Import the new service
import { COLORS } from "../../utils/Theme";
import { API_BASE_URL } from "../../Config/API";

function DiscoverPlace({ navigation }) {
  const [productData, setProductData] = useState([]);
  const [schemeRules, setSchemeRules] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced fetchRemainingDays function using the new service
const fetchRemainingDays = useCallback(async (schemeId, joinDate) => {
  try {

    // Format joinDate to YYYY-MM-DD format
    let formattedDate = joinDate;

    // Convert to YYYY-MM-DD format if needed
    if (joinDate) {
      // Handle ISO format (2025-12-29T00:00:00)
      if (joinDate.includes('T')) {
        formattedDate = joinDate.split('T')[0];
      } 
      // Handle if it's not in YYYY-MM-DD format
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(joinDate)) {
        const dateObj = new Date(joinDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split('T')[0];
        }
      }
    }


    // Use your API endpoint
    const apiUrl = `${API_BASE_URL}/scheme-bonus/all_remainingDays?schemeId=${schemeId}&joinDate=${formattedDate}`;


    // Make API call
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Log only what we need

    // Return ONLY the remainingDays value (not the whole object)
    return data.remainingDays || 0;

  } catch (error) {
    console.error(`❌ Error in fetchRemainingDays:`, error.message || error);
    return 0; // Return 0 on error
  }
}, []);

  const handlePayNow = (item) => {
    navigation.navigate("Buy", {
      productData: item,
      commamt: item.COMMAMT ?? item.schemeSummary?.COMMAMT ?? 0,
    });
  };

  // Fetch all scheme rules once
  const fetchSchemeRules = async () => {
    try {
      const allSchemes = await getAllSchemes();
      const rulesMap = {};

      allSchemes.forEach((scheme) => {
        rulesMap[scheme.SchemeId] = {
          WeightLedger: scheme.WeightLedger,
          FixedIns: scheme.FixedIns,
          Instalment: scheme.Instalment,
          COMMAMT: scheme.COMMAMT ?? 0,
        };
      });

      setSchemeRules(rulesMap);
      return rulesMap;
    } catch (err) {
      console.error("Error fetching scheme rules:", err);
      return {};
    }
  };

  // Fetch remaining days for each product
  const fetchRemainingDaysForProducts = async (products) => {
    try {

      const apiPromises = products.map(async (product, index) => {
        try {
          // Add a small delay to avoid overwhelming the server
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Get schemeId and joinDate from product
          const schemeId = product.schemeId || 
                          product.schemeSummary?.schemeId || 
                          product.schemeSummary?.schemeid;

          const joinDate = product.joinDate || 
                          product.schemeSummary?.joinDate || 
                          product.schemeSummary?.Startdate ||
                          product.schemeSummary?.startdate ||
                          product.schemeSummary?.startDate;

          if (!schemeId || !joinDate) {
            return {
              product,
              apiResult: null,
            };
          }

          const apiResult = await fetchRemainingDays(schemeId, joinDate);

          return {
            product,
            apiResult,
          };
        } catch (err) {
          return {
            product,
            apiResult: null,
          };
        }
      });

      const apiResults = await Promise.all(apiPromises);

      // Process results - only use API results
      const updatedProducts = apiResults.map(({ product, apiResult }) => {
        // Use API result if available, otherwise keep existing remainingDays or default to 0
        const remainingDays = (apiResult !== null && apiResult !== undefined) ? apiResult : 0;


        return {
          ...product,
          remainingDays,
        };
      });

      return updatedProducts;
    } catch (err) {
      console.error("❌ Error in fetchRemainingDaysForProducts:", err);
      // Return products without remaining days update on error
      return products.map(product => ({
        ...product,
        remainingDays: 0, // Set to 0 on API failure
      }));
    }
  };

  const fetchPhoneSearchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);

      const storedPhoneNumber = await AsyncStorage.getItem("userPhoneNumber");
      if (!storedPhoneNumber) {
        setError("Phone number not found");
        return;
      }


      // Fetch scheme rules first
      const rules = await fetchSchemeRules();

      // Then fetch account details
      const accounts = await getPhoneDetails(storedPhoneNumber);

      if (!accounts || accounts.length === 0) {
        setError("No schemes available for this account");
        setProductData([]);
        return;
      }

      const processedProducts = accounts.map((item) => {
        const currentDate = new Date();
        const maturityDate = item.maturityDate
          ? new Date(item.maturityDate)
          : null;

        const isActive = !maturityDate || currentDate < maturityDate;
        const status = isActive ? "Active" : "Deactive";

        const schemeName = item.schemeSummary?.schemeName?.trim();
        const schemeIdKey = Number(item.schemeSummary?.schemeId || item.schemeSummary?.schemeid);
        const schemeRule = rules[schemeIdKey] || {};

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

        // Extract dates for debugging
        const joinDate = item.joinDate || 
                        item.schemeSummary?.joinDate || 
                        item.schemeSummary?.Startdate ||
                        item.schemeSummary?.startdate ||
                        item.schemeSummary?.startDate;


        return {
          ...item,
          status,
          regno: item.regNo,
          groupcode: item.groupCode,
          pname: item.pname || item.personalInfo?.pName,
          maturitydate: item.maturityDate,
          joinDate, // Store joinDate for easy access
          remainingDays: 0, // Initialize
          COMMAMT: schemeRule.COMMAMT ?? 0, // top-level for easy access in Buy.js

          /* 🔥 SCHEME SUMMARY WITH API RULES */
          schemeSummary: {
            ...item.schemeSummary,
            WeightLedger:
              schemeRule.WeightLedger || item.schemeSummary?.WeightLedger,
            FixedIns: schemeRule.FixedIns || item.schemeSummary?.FixedIns,
            Instalment: schemeRule.Instalment || item.schemeSummary?.instalment,
            COMMAMT: schemeRule.COMMAMT ?? item.schemeSummary?.COMMAMT ?? 0,
            schemeType: {
              isWeightScheme,
              isAmountScheme,
              isFixedDeposit,
              isDigitalScheme,
            },
          },

          /* 🔥 TRANS BALANCE */
          schemaSummaryTransBalance: {
            insPaid:
              item.schemeSummary?.schemaSummaryTransBalance?.insPaid ??
              item.trans?.insPaid ??
              0,
            amtrecd:
              item.schemeSummary?.schemaSummaryTransBalance?.amtrecd ??
              item.trans?.amtrecd ??
              0,
          },
        };
      });

      // Fetch remaining days for all products from API only
      const productsWithRemainingDays = await fetchRemainingDaysForProducts(processedProducts);

      productsWithRemainingDays.forEach(p => {
      });

      setProductData(productsWithRemainingDays);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    fetchPhoneSearchData(false);
  }, []);

  const onRefresh = () => fetchPhoneSearchData(true);

  const renderProductCard = ({ item }) => {

    return (
      <ProductCard
        productData={item}
        navigation={navigation}
        onPayNow={() => handlePayNow(item)}
        remainingDate={item.remainingDays || 0} // Pass the API fetched remaining days
      />
    );
  };

  const renderContent = () => {
    if (initialLoad && loading) {
      return (
        <View style={localStyles.loadingContainer}>
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </View>
      );
    }

    if (error && productData.length === 0) {
      return (
        <View style={localStyles.errorContainer}>
          <TextDefault style={localStyles.errorText}>{error}</TextDefault>
        </View>
      );
    }

    return (
      <FlatList
        data={productData}
        renderItem={renderProductCard}
        keyExtractor={(item, index) =>
          `${item.regNo}-${item.groupCode}-${index}`
        }
        contentContainerStyle={localStyles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={
          <View style={localStyles.emptyContainer}>
            <TextDefault style={localStyles.emptyText}>
              No schemes found
            </TextDefault>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/image.png")}
        style={styles.mainBackground}
        imageStyle={styles.backgroundImageStyle}
      >
        <SafeAreaView style={styles.safeArea}>
          <CommonHeader title="Your Schemes" />

          <View style={localStyles.contentContainer}>{renderContent()}</View>

          <BottomTab screen="SCHEMES" />
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const localStyles = StyleSheet.create({
  contentContainer: { flex: 1 },
  loadingContainer: { flex: 1, padding: 16 },
  listContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: "center",
    fontSize: 16,
  },
  emptyText: {
    color: COLORS.textLight,
    textAlign: "center",
    fontSize: 16,
  },
});

export default DiscoverPlace;