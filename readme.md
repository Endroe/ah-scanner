# Albert Heijn Price Comparator

Albert Heijn Price Comparator is a Chrome extension that allows users to compare prices of products on the Albert Heijn website with prices from other grocery stores. The extension fetches product information directly from the Albert Heijn API.

It allows users to interactively select or deselect parts of the product name to refine the search for price comparisons, which was my biggest issue with similar apps.


## How It Works

1. Navigate to an Albert Heijn product page (e.g., `https://www.ah.nl/producten/product/...`).
2. Open the extension popup by clicking the extension icon in the Chrome toolbar.
3. The extension automatically extracts product information from the page.
4. The extension compares the product's price with prices from other grocery stores and displays the results in the popup.
5. Users can interactively refine the product name to improve search accuracy.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top-right corner.
4. Click "Load unpacked" and select the folder containing this project.
5. The extension will be added to Chrome.

## Acknowledgments

- **[CheckJeBon](https://github.com/supermarkt/checkjebon/)**: The extension uses data from this repository to compare prices across supermarkets.
- **[Fuzzysort](https://github.com/farzher/fuzzysort)**: Amazing fuzzy sort script by farzher

## Screenshots

### Comparison Results
![Comparison Results](images/comparison-results-screenshot.png)
