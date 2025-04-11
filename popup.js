document.addEventListener("DOMContentLoaded", initializePopup);

function initializePopup() {
  resetProductInfo();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const currentUrl = currentTab.url;

    if (currentUrl.includes("ah.nl/producten/product")) {
      // Attempt to fetch product info; inject content script if it fails
      fetchProductInfoFromContentScript(currentTab.id).catch(() => {
        console.warn("Content script not running. Injecting content script...");
        injectContentScript(currentTab.id).then(() => {
          fetchProductInfoFromContentScript(currentTab.id);
        }).catch((error) => {
          console.error("Failed to inject content script:", error);
          displayStatusMessage("Error: Could not inject content script. Please refresh the page.");
        });
      });
    } else {
      displayStatusMessage("Navigate to an Albert Heijn product page to compare prices.");
    }
  });
}

function productTitleHasSize(productInfo) {

  return productInfo?.weight && /\d+\s?(g|gram|kg|ml|l|liter|litre)/i.test(productInfo.weight);
}

function injectContentScript(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["content.js"]
  });
}

function resetProductInfo() {
  document.getElementById("product-name").innerHTML = "";
  document.getElementById("product-image").src = "";
  document.getElementById("ah-price").innerHTML = "";
  document.getElementById("status").classList.remove("hidden");
  document.getElementById("product-info").classList.add("hidden");
  document.getElementById("loading").classList.add("hidden");
}


function fetchProductInfoFromContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: "getProductInfo" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error communicating with content script:", chrome.runtime.lastError.message);
        reject(chrome.runtime.lastError);
      } else if (response && response.productInfo) {
        displayProductInfo(response.productInfo);
        resolve();
      } else {
        displayStatusMessage("Could not find product information on this page.");
        reject(new Error("No product information found."));
      }
    });
  });
}

function displayStatusMessage(message) {
  const statusElement = document.getElementById("status");
  statusElement.textContent = message;
  statusElement.classList.remove("hidden");
}

function showFilteredProductInfo(productInfo) {
  const chipContainer = document.getElementById("filter-chip-container");
  chipContainer.innerHTML = "";
  
  if (productTitleHasSize(productInfo)) {
    const chip = document.createElement("div");
    chip.className = `
      size-chip px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full 
      transition-opacity duration-200 cursor-pointer hover:bg-blue-200 
      flex items-center select-none
    `.trim();
  
    chip.textContent = "Filtered by Size";
  
    chip.addEventListener("click", () => {
      chip.classList.toggle("opacity-50");
  
      const isActive = !chip.classList.contains("opacity-50");
      console.log("Size filter active:", isActive);
  
      // TODO: apply functionality;
    });
  
    chipContainer.appendChild(chip);
  }
}

function displayProductInfo(productInfo) {

  showFilteredProductInfo(productInfo);

  document.getElementById("status").classList.add("hidden");
  document.getElementById("product-info").classList.remove("hidden");
  document.getElementById("loading").classList.remove("hidden");

  document.getElementById("product-name").innerHTML = `
    ${productInfo.name} 
    <span class="ml-2 text-xs font-medium px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full">
      ${productInfo.weight}
    </span>`;
  document.getElementById("product-image").src = productInfo.image;

  const priceElement = document.getElementById("ah-price");
  if (productInfo.bonusPrice === "None" || productInfo.bonusPrice === productInfo.price) {
    priceElement.innerHTML = `<span class="text-primary">€${productInfo.price}</span>`;
  } else {
    priceElement.innerHTML = `
      <span class="text-primary">€${productInfo.bonusPrice}</span> 
      <span class="text-xs text-gray-500">€${productInfo.price}</span> 
      <span class="text-xs font-medium px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded-full">Bonus</span>`;
  }

  setupProductNameInteraction(productInfo);
  fetchComparisonData(productInfo);
}

function setupProductNameInteraction(productInfo) {
  const productNameEl = document.getElementById("product-name");
  const brandName = productInfo.brand;
  const nameParts = productInfo.name.replace(brandName, "").trim().split(" ");
  const deselectedParts = [];
  let brandSelected = true;

  function renderNameParts() {
    productNameEl.innerHTML = `
      <span class="brand-name font-bold text-gray-800 bg-primary/10 text-primary rounded-full py-2" data-selected="${brandSelected}">
        ${brandName}
      </span>
      <div class="flex flex-wrap gap-2">
        ${nameParts.map((part, index) => `
          <div class="name-part text-xs cursor-pointer duration-300 bg-green-200 hover:bg-red-100 text-primary rounded-full px-2 py-1 flex items-center" data-index="${index}" data-selected="true">
            <span>${part}</span>
            <button class="ml-1.5 p-0.5 rounded-full hover:bg-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>`).join("")}
        ${deselectedParts.map((part, index) => `
          <div class="deselected-part text-xs cursor-pointer duration-300 bg-red-200 hover:bg-green-100 text-gray-600 rounded-full px-3 py-1 flex items-center" data-index="${index}" data-selected="false">
            <span>${part}</span>
            <button class="ml-1.5 p-0.5 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>`).join("")}
      </div>`;
  }

  function updateProductName() {
    const selectedParts = brandSelected ? [brandName, ...nameParts] : nameParts;
    productInfo.name = selectedParts.join(" ").trim();
  }

  productNameEl.addEventListener("click", (e) => {
    const target = e.target.closest(".brand-name, .name-part, .deselected-part");
    if (!target) return;

    if (target.classList.contains("brand-name")) {
      brandSelected = target.dataset.selected === "false";
    } else if (target.classList.contains("name-part") && target.dataset.selected === "true") {
      const index = parseInt(target.dataset.index, 10);
      deselectedParts.push(nameParts.splice(index, 1)[0]);
    } else if (target.classList.contains("deselected-part") && target.dataset.selected === "false") {
      const index = parseInt(target.dataset.index, 10);
      nameParts.push(deselectedParts.splice(index, 1)[0]);
    }

    updateProductName();
    renderNameParts();

    if (productInfo.name.trim() === "") {
      showNoSelectionAlert();
    } else {
      fetchComparisonData(productInfo);
    }
  });

  renderNameParts();
}

function showNoSelectionAlert() {
  const comparisonResultsEl = document.getElementById("comparison-results");
  const noDataEl = document.getElementById("no-data");

  comparisonResultsEl.classList.add("hidden");
  noDataEl.classList.remove("hidden");
  noDataEl.innerHTML = `
    <div class="py-8 flex flex-col items-center justify-center">
      <div class="spinner w-10 h-10 border-4 border-red-300 border-t-red-500 rounded-full animate-spin mb-3"></div>
      <p class="text-gray-600">You need to select at least one term to search.</p>
    </div>`;
}

async function fetchComparisonData(productInfo) {
  try {
    chrome.runtime.sendMessage({ action: "getCachedData" }, (response) => {
      if (response && response.data) {
        const comparisonResults = compareProducts(productInfo, response.data);

        if (comparisonResults.hasMatches) {
          displayComparisonResults(comparisonResults, productInfo.price);
          document.getElementById("no-data").classList.add("hidden");
        } else {
          document.getElementById("no-data").classList.remove("hidden");
        }
      } else {
        displayStatusMessage("Error fetching comparison data.");
      }
      document.getElementById("loading").classList.add("hidden");
    });
  } catch (error) {
    document.getElementById("loading").classList.add("hidden");
    displayStatusMessage("Error fetching comparison data.");
    console.error("Error fetching comparison data:", error);
  }
}

// Cache for comparison data
let cachedData = null;
let lastFetchTime = null;

function searchName(product, ahProductInfo) {
  const productName = product.n
  const ahName = ahProductInfo.name.toLowerCase().replace(/ah /gi, "")

  if (productName.toLowerCase().includes(ahName)) {
    return true
  } else {
    return false
  }
}

function compareProducts(ahProductInfo, data) {
  const results = {
    cheaper: [],
    samePrice: [],
    expensive: [],
    notFound: [],
    hasMatches: false,
  };

  const ahPrice = Number.parseFloat(ahProductInfo.bonusPrice === "None" ? ahProductInfo.price : ahProductInfo.bonusPrice);

  // Iterate through the fetched data to find matching products
  for (const store in data) {
    const storeProducts = data[store].d; // Assuming 'd' contains the product list
    const storeName = data[store].n;
    const storeUrl = data[store].u;
    let foundMatch = false;

    let cleaned_name = ahProductInfo.name.toLowerCase();
    let brand_name = ahProductInfo.brand.toLowerCase();
    
    // First attempt: search without brand name
    let matches = searchProductsInStore(
      storeProducts, 
      cleaned_name.replace(brand_name, "").replace(/\s+/g, " ").trim(),
      storeName,
      storeUrl,
      ahPrice,
      data[store].i
    );
    
    // If we didn't find enough matches, try with the brand name included
    if (matches.found.length < 2) {
      const withBrandMatches = searchProductsInStore(
        storeProducts,
        cleaned_name, // Use full name with brand
        storeName,
        storeUrl,
        ahPrice,
        data[store].i
      );
      
      // Combine matches, removing duplicates
      const combinedMatches = [...matches.found];
      withBrandMatches.found.forEach(match => {
        if (!combinedMatches.some(m => m.name === match.name)) {
          combinedMatches.push(match);
        }
      });
      
      foundMatch = combinedMatches.length > 0;
      
      // Add matches to results
      combinedMatches.forEach(match => {
        if (match.type === 'cheaper') results.cheaper.push(match);
        else if (match.type === 'same') results.samePrice.push(match);
        else if (match.type === 'expensive') results.expensive.push(match);
      });
      
      results.hasMatches = results.hasMatches || foundMatch;
    } else {
      // We found enough matches in the first attempt
      foundMatch = matches.found.length > 0;
      
      // Add matches to results
      matches.found.forEach(match => {
        if (match.type === 'cheaper') results.cheaper.push(match);
        else if (match.type === 'same') results.samePrice.push(match);
        else if (match.type === 'expensive') results.expensive.push(match);
      });
      
      results.hasMatches = results.hasMatches || foundMatch;
    }

    if (!foundMatch) {
      results.notFound.push(storeName);
    }
  }

  // Helper function to search products in a store
  function searchProductsInStore(storeProducts, searchTerm, storeName, storeUrl, ahPrice, storeLogo) {
    const foundMatches = [];
    
    // Clean and process store products for better matching
    const cleanedStoreProducts = storeProducts.map(product => {
      let cleanedProductName = product.n.toLowerCase();
      
      // Remove units from the product name
      cleanedProductName = cleanedProductName.replace(/\b(kg|g|l|ml|m|cm|mm)\b/gi, "").trim();
      
      // Remove numbers
      cleanedProductName = cleanedProductName.replace(/\d+/g, "").trim();
      
      // Remove extra spaces
      cleanedProductName = cleanedProductName.replace(/\s+/g, " ").trim();
      
      return { 
        ...product, 
        cleanedName: cleanedProductName 
      };
    });

    // Use fuzzysort to find the best matches with cleaned names
    const fuzzyResults = fuzzysort.go(searchTerm, cleanedStoreProducts, { key: 'cleanedName' });

    for (const result of fuzzyResults) {
      if (result.score > 0.4) {
        const product = result.obj;
        const productPrice = parseFloat(product.p);
        
        let matchType = '';
        let matchDetails = {};
        
        // Compare prices and categorize the product
        if (productPrice < ahPrice) {
          matchType = 'cheaper';
          matchDetails = {
            savings: (ahPrice - productPrice).toFixed(2)
          };
        } else if (productPrice === ahPrice) {
          matchType = 'same';
          matchDetails = {
            savings: 0
          };
        } else {
          matchType = 'expensive';
          matchDetails = {
            difference: (productPrice - ahPrice).toFixed(2)
          };
        }
        
        foundMatches.push({
          type: matchType,
          store: storeName,
          name: product.n,
          link: storeUrl + product.l,
          price: productPrice.toFixed(2),
          logo: storeLogo,
          weight: product.s,
          ...matchDetails
        });
      }
    }
    
    return {
      found: foundMatches
    };
  }

  // Sort cheaper products by savings (descending) and then by price (ascending)
  results.cheaper.sort((a, b) => b.savings - a.savings || a.price - b.price);

  // Sort same-price products alphabetically by store name
  results.samePrice.sort((a, b) => a.store.localeCompare(b.store));

  // Sort expensive products by price difference (ascending)
  results.expensive.sort((a, b) => a.difference - b.difference);

  return results;
}

function displayComparisonResults(results, ahPrice) {
  document.getElementById("comparison-results").classList.remove("hidden")

  const cheaperStoresEl = document.getElementById("cheaper-stores")
  const samePriceStoresEl = document.getElementById("same-price-stores")
  const expensiveStoresEl = document.getElementById("expensive-stores")
  const notFoundStoresEl = document.getElementById("not-found-stores")

  // Clear previous results
  cheaperStoresEl.innerHTML = ""
  samePriceStoresEl.innerHTML = ""
  expensiveStoresEl.innerHTML = ""
  notFoundStoresEl.innerHTML = ""

  // Add section titles if there are results
  if (results.cheaper.length > 0) {
    cheaperStoresEl.innerHTML = '<div class="section-title">Cheaper Alternatives</div>'
    results.cheaper.forEach((item) => {
      cheaperStoresEl.appendChild(createStoreElement(item, "cheaper"))
    })
  }

  if (results.samePrice.length > 0) {
    samePriceStoresEl.innerHTML = '<div class="section-title">Same Price</div>'
    results.samePrice.forEach((item) => {
      samePriceStoresEl.appendChild(createStoreElement(item, "same-price"))
    })
  }

  if (results.expensive.length > 0) {
    expensiveStoresEl.innerHTML = '<div class="section-title">More Expensive</div>'
    results.expensive.forEach((item) => {
      expensiveStoresEl.appendChild(createStoreElement(item, "expensive"))
    })
  }
  if (results.notFound.length > 0) {
    notFoundStoresEl.innerHTML = '<div class="section-title">Not Found At</div>'
    
    // Add Not Found Stores section with the grid design
    const notFoundStoresGridEl = document.createElement("div");
    notFoundStoresGridEl.className = "mt-4";
    notFoundStoresGridEl.innerHTML = `
      <div class="grid grid-cols-4 gap-3">
        ${getNotFoundStoresHtml(results.notFound)}
      </div>
    `;
    
    notFoundStoresEl.appendChild(notFoundStoresGridEl);
  }
}

// Helper function to generate the not found store logos HTML
function getNotFoundStoresHtml(notFoundStores) {
  const storeColors = {
    "Albert Heijn": "#00A0E2",
    "Jumbo": "#FFC600",
    "Lidl": "#0050AA",
    "Dirk": "#D50032",
    "Plus": "#008539",
    "Aldi": "#0063AF",
    "Coop": "#DC0028",
    "Vomar": "#DD0000"
  };
  
  return notFoundStores.map(store => {
    const shortName = store.substring(0, 2).toUpperCase();
    const color = storeColors[store] || "#888888";
    
    return `
      <div class="group flex flex-col items-center transition-all duration-300 hover:-translate-y-1">
        <div class="w-14 h-14 rounded-full flex items-center justify-center shadow-sm opacity-50"
             style="background-color: ${color}">
          <span class="text-white font-bold text-sm">${shortName}</span>
        </div>
        <span class="mt-1.5 text-xs text-gray-500">
          ${store}
        </span>
      </div>
    `;
  }).join('');
}

function createStoreElement(item, priceClass) {
  const el = document.createElement("div");
  el.className = `store-card bg-white border rounded-lg p-3 duration-300 hover:-translate-y-1 hover:shadow-md mt-3`;

  // Determine border and text colors based on priceClass
  let borderColor = "border-gray-200";
  let priceColor = "text-primary";
  let badgeBgColor = "bg-gray-100";
  let badgeTextColor = "text-gray-600";
  let badgeText = "Same";

  if (priceClass === "cheaper") {
    borderColor = "border-green-200";
    priceColor = "text-success";
    badgeBgColor = "bg-green-100";
    badgeTextColor = "text-green-800";
    badgeText = `-€${item.savings}`;
  } else if (priceClass === "expensive") {
    borderColor = "border-orange-200";
    priceColor = "text-warning";
    badgeBgColor = "bg-orange-100";
    badgeTextColor = "text-orange-800";
    badgeText = `+€${item.difference}`;
  } else if (priceClass === "not-found") {
    el.className += " opacity-75";
    badgeText = "Not available";
    priceColor = "text-gray-500";
  }

  el.className += ` ${borderColor}`;

  // Use the store logo from data[store].i if available, otherwise fallback to local logo
  const storeLogo = item.logo || `images/stores/${item.store.toLowerCase()}.png`;

  el.innerHTML = `
    <a href="${item.link}" target="_blank" class="block">
    <div class="flex items-center space-x-1">
      <div class="flex-shrink-0">
        <img src="${storeLogo}" alt="${item.store}" class="w-10 h-10 rounded-full object-cover border border-gray-200 ${priceClass === "not-found" ? "grayscale" : ""}">
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-start">
          <h4 class="text-sm font-medium text-gray-900 truncate">${item.store.toUpperCase()}</h4>
          <div class="flex items-center">
            <span class="text-lg font-bold ${priceColor}">€${item.price}</span>
            ${
              priceClass !== "not-found"
                ? `<span class="ml-2 text-xs font-medium px-1.5 py-0.5 ${badgeBgColor} ${badgeTextColor} rounded-full">${badgeText}</span>`
                : ""
            }
          </div>
        </div>
        <p class="text-sm text-gray-600 truncate">${item.weight} • ${item.name} </p>
      </div>
    </div>
    </a>
  `;

  return el;
}

