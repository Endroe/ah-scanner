/**
 * Background script for the Chrome extension.
 * It fetches data from https://github.com/supermarkt/checkjebon/
 * Shoutout to the makers of checkjebon
 */

let cachedData = null;
let lastFetchTime = null;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

// Fetch fresh data from GitHub
async function fetchGitHubData() {
  try {
    const response = await fetch("https://raw.githubusercontent.com/supermarkt/checkjebon/refs/heads/main/data/supermarkets.json");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    cachedData = data;
    lastFetchTime = Date.now();
    console.log("GitHub data fetched and cached.");
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
  }
}

// Periodically fetch
setInterval(() => {
  if (!lastFetchTime || Date.now() - lastFetchTime >= ONE_DAY_IN_MS) {
    fetchGitHubData();
  }
}, ONE_DAY_IN_MS);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getCachedData") {
    (async () => {
      if (cachedData && lastFetchTime && (Date.now() - lastFetchTime < ONE_DAY_IN_MS)) {
        sendResponse({ data: cachedData });
      } else {
        await fetchGitHubData();
        sendResponse({ data: cachedData });
      }
    })();
    return true;
  }
});
