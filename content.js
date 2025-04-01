/**
 * Content script for the Chrome extension.
 * It fetches product information from the AH API and sends it to the popup.
 */

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProductInfo") {
    fetchProductInfo()
      .then((info) => sendResponse({ productInfo: info }))
      .catch((error) => {
        console.error("Error fetching product info:", error);
        sendResponse({ productInfo: null });
      });
    return true;
  }
});

// Notify the popup script that the content script is loaded
chrome.runtime.sendMessage({ action: "contentScriptLoaded" });

const API_HEADERS = {
  "Host": "api.ah.nl",
  "x-dynatrace": "MT_3_4_772337796_1_fae7f753-3422-4a18-83c1-b8e8d21caace_0_1589_109",
  "x-application": "AHWEBSHOP",
  "user-agent": "Appie/8.8.2 Model/phone Android/7.0-API24",
  "content-type": "application/json; charset=UTF-8",
};

/**
 * Fetches an anonymous access token from the API.
 * This token is used for accessing product details without user authentication.
 * @returns {Promise<string>} - The access token for anonymous access
 */
async function getAnonymousAccessToken() {
  try {
    const response = await fetch(
      "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous",
      {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ clientId: "appie" }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch access token: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error fetching anonymous access token:", error);
    throw error;
  }
}
/**
 * Extracts the product ID from the given URL.
 * The product ID is expected to be in the format /producten/product/{id}.
 * @param {string} url - The URL containing the product ID
 * @returns {string|null} - The extracted product ID or null if not found
 */

function extractProductId(url) {
  const match = url.match(/\/producten\/product\/([a-zA-Z0-9]+)/);
  if (match && match[1].startsWith('wi')) {
    return match[1].substring(2); // Remove 'wi' prefix
  }
  return match ? match[1] : null;
}

/**
 * Fetches product details from the API using the product ID.
 * This function requires an access token for authentication.
 * @param {string} productId - The ID of the product to fetch details for
 * @param {string} accessToken - The access token for authentication
 * @returns {Promise<object>} - The product details
 */
async function fetchProductDetails(productId, accessToken) {
  const headers = {
    ...API_HEADERS,
    "Authorization": `Bearer ${accessToken}`,
  };

  const response = await fetch(
    `https://api.ah.nl/mobile-services/product/detail/v4/fir/${productId}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches product information from the API.
 * This function retrieves the product ID from the current URL,
 * fetches an access token,
 * and then retrieves product details using the product ID.
 * @returns {Promise<object|null>} - The product information or null if not found
 */
async function fetchProductInfo() {
  const productUrl = window.location.href;

  try {
    const productId = extractProductId(productUrl);
    if (!productId) {
      throw new Error("Product ID not found in the URL.");
    }

    const accessToken = await getAnonymousAccessToken();
    const productData = await fetchProductDetails(productId, accessToken);

    return extractProductInfo(productData, productId, productUrl);
  } catch (error) {
    console.error("Error fetching product info from API:", error);
    return null;
  }
}

/**
 * Extracts product information from the API response.
 * This function retrieves various details about the product,
 * including name, brand, price, and bonus information.
 * @param {object} productData - The API response containing product details
 * @param {string} productId - The ID of the product
 * @param {string} productUrl - The URL of the product
 * @returns {object} - An object containing the extracted product information
 */

function extractProductInfo(productData, productId, productUrl) {
  const productCard = productData.productCard || {};
  return {
    name: productCard.title || "Unknown Product",
    brand: productCard.brand || "None",
    price: productCard.priceBeforeBonus || "Unknown",
    bonusPrice: productCard.currentPrice || "None",
    bonus: !!productCard.isBonus,
    bonusMechanism: productCard.bonusMechanism || "None",
    id: productId,
    url: productUrl,
    image: productCard.images?.[0]?.url || null,
    weight: productCard.salesUnitSize || "Unknown",
  };
}

