import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import fetch from "node-fetch";
import sharp from "sharp";
import { imageHash } from "image-hash";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = "4b68fdb26b1588067a3cddce7353322d";
const API_URL = "https://api.flickr.com/services/rest";
const PER_PAGE = 500;
const DELAY_BETWEEN_REQUESTS = 500;
const MAX_PAGES = 100;

const constructFlickrImageUrl = (photo) => {
  return `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchFlickrImages = async (text, totalResults) => {
  let imageUrls = new Set();
  let page = 1;

  while (imageUrls.size < totalResults && page <= MAX_PAGES) {
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
        },
        headers: {
          "User-Agent": "PostmanRuntime/7.28.4",
        },
      });

      const photos = response.data.photos.photo;
      photos.forEach((photo) => {
        const url = constructFlickrImageUrl(photo);
        imageUrls.add(url);
      });

      console.log(
        `Fetched page ${page} for "${text}", got ${imageUrls.size} unique images so far`
      );

      page++;
      await delay(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      console.error(
        `Error fetching page ${page} for "${text}": ${error.message}`
      );
      if (error.response && error.response.status === 429) {
        console.log("Rate limit exceeded, waiting before retrying...");
        await delay(DELAY_BETWEEN_REQUESTS * 5);
      } else {
        throw error;
      }
    }
  }

  return Array.from(imageUrls).slice(0, totalResults);
};

const downloadAndResizeImage = async (url, outputPath) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    await sharp(Buffer.from(buffer)).trim().resize(150, 150).toFile(outputPath);
    console.log(
      `Image ${path.basename(outputPath)} resized and saved successfully!`
    );
  } catch (err) {
    console.error(
      `Error processing image ${path.basename(outputPath)}: ${err}`
    );
  }
};

const hashImage = (filePath) => {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
};

const removeDuplicates = async (directory) => {
  try {
    const files = await fs.readdir(directory);
    const hashMap = new Map();

    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(10);

    const tasks = files.map((file) =>
      limit(async () => {
        const filePath = path.join(directory, file);
        try {
          const hash = await hashImage(filePath);
          if (hashMap.has(hash)) {
            await fs.unlink(filePath);
            console.log(`Deleted duplicate: ${filePath}`);
          } else {
            hashMap.set(hash, filePath);
          }
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);
        }
      })
    );

    await Promise.all(tasks);
    console.log("Duplicate removal complete.");
  } catch (error) {
    console.error("Error reading directory:", error);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log(
      "Usage: node downloadImages.mjs <totalResults> <outputName> <searchTerm1> [<searchTerm2> ...]"
    );
    process.exit(1);
  }

  const totalResults = parseInt(args[0], 10);
  const outputName = args[1];
  const searchTerms = args.slice(2);

  const outputDir = path.join(__dirname, "outputs", outputName);
  await fs.mkdir(outputDir, { recursive: true });

  let allImageUrls = new Set();

  // Fetch images for each search term
  for (const term of searchTerms) {
    const urls = await fetchFlickrImages(term, totalResults);
    urls.forEach((url) => allImageUrls.add(url));
  }

  console.log(`Total unique images fetched: ${allImageUrls.size}`);

  // Download and resize images
  const pLimit = (await import("p-limit")).default;
  const limit = pLimit(10);

  const downloadTasks = Array.from(allImageUrls).map((url, index) =>
    limit(() =>
      downloadAndResizeImage(url, path.join(outputDir, `${index}.jpg`))
    )
  );

  await Promise.all(downloadTasks);

  // Remove duplicates
  await removeDuplicates(outputDir);

  console.log("All operations completed successfully!");
};

main().catch((error) => {
  console.error("An error occurred:", error);
});
