const axios = require("axios");
const fs = require("fs");

const API_KEY = "4b68fdb26b1588067a3cddce7353322d";
const API_URL = "https://api.flickr.com/services/rest";
const PER_PAGE = 500;
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay between requests to avoid rate limiting

const constructFlickrImageUrl = (photo) => {
  return `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchFlickrImages = async (text, totalResults) => {
  let imageUrls = [];
  let page = 1;
  const pages = Math.ceil(totalResults / PER_PAGE);

  while (imageUrls.length < totalResults && page <= pages) {
    try {
      const response = await axios.get(API_URL, {
        params: {
          method: "flickr.photos.search",
          api_key: API_KEY,
          text,
          format: "json",
          nojsoncallback: 1,
          per_page: PER_PAGE,
          page,
          content_type: 1,
          sort: "relevance",
          safe_search: 1,
          //   color_codes: "1,2,3",
          orientation: "square",
        },
        headers: {
          "User-Agent": "PostmanRuntime/7.28.4",
        },
      });

      const photos = response.data.photos.photo;
      const urls = photos.map(constructFlickrImageUrl);
      imageUrls = imageUrls.concat(urls);

      console.log(
        `Fetched page ${page}, got ${photos.length} images, total images: ${imageUrls.length}`
      );

      page++;
      await delay(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      console.error(`Error fetching page ${page}: ${error.message}`);
      if (error.response && error.response.status === 429) {
        console.log("Rate limit exceeded, waiting before retrying...");
        await delay(DELAY_BETWEEN_REQUESTS);
      } else {
        throw error;
      }
    }
  }

  return imageUrls.slice(0, totalResults);
};

const saveImageUrls = (imageUrls, filename) => {
  const dir = "inputs";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFileSync(filename, JSON.stringify(imageUrls, null, 2));
  console.log(`Saved ${imageUrls.length} image URLs to ${filename}`);
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: node getFlickrImages.js <searchText> <totalResults>");
    return;
  }

  const searchText = args[0];
  const totalResults = parseInt(args[1], 10);
  const filename = `inputs/${searchText}.json`;

  try {
    const imageUrls = await fetchFlickrImages(searchText, totalResults);
    saveImageUrls(imageUrls, filename);
  } catch (error) {
    console.error("Error fetching images:", error.message);
  }
};

main();
