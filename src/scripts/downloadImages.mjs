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
const MAX_PAGES = 20;
const IMAGES_PER_TERM = 5000;

const constructFlickrImageUrl = (photo) => {
  return `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchFlickrImages = async (text) => {
  let imageUrls = new Set();
  let page = 1;

  while (imageUrls.size < IMAGES_PER_TERM && page <= MAX_PAGES) {
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

  return Array.from(imageUrls).slice(0, IMAGES_PER_TERM);
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

const hammingDistance = (hash1, hash2) => {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
};

const removeSimilarDuplicates = async (directory) => {
  try {
    const files = await fs.readdir(directory);
    const hashMap = new Map();
    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(10);

    // First, calculate hashes for all images
    const hashPromises = files.map((file) =>
      limit(async () => {
        const filePath = path.join(directory, file);
        const hash = await hashImage(filePath);
        return { file, hash };
      })
    );

    const hashes = await Promise.all(hashPromises);

    // Then, compare hashes and remove similar images
    const similarityThreshold = 20; // Adjust this value to change sensitivity

    for (let i = 0; i < hashes.length; i++) {
      const { file, hash } = hashes[i];
      let isSimilar = false;

      for (const [existingHash, existingFile] of hashMap.entries()) {
        const distance = hammingDistance(hash, existingHash);
        if (distance <= similarityThreshold) {
          isSimilar = true;
          break;
        }
      }

      if (isSimilar) {
        const filePath = path.join(directory, file);
        await fs.unlink(filePath);
        console.log(`Deleted similar image: ${filePath}`);
      } else {
        hashMap.set(hash, file);
      }
    }

    console.log("Similar image removal complete.");
  } catch (error) {
    console.error("Error removing similar images:", error);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(
      "Usage: node downloadImages.mjs <mainFolderName> <searchTerm1> [<searchTerm2> ...]"
    );
    process.exit(1);
  }

  const mainFolderName = args[0];
  const searchTerms = args.slice(1);

  const mainOutputDir = path.join(__dirname, "outputs", mainFolderName);
  await fs.mkdir(mainOutputDir, { recursive: true });

  for (const term of searchTerms) {
    const termOutputDir = path.join(mainOutputDir, term);
    await fs.mkdir(termOutputDir, { recursive: true });

    const urls = await fetchFlickrImages(term);
    console.log(`Fetched ${urls.length} unique images for "${term}"`);

    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(10);

    const downloadTasks = urls.map((url, index) =>
      limit(() =>
        downloadAndResizeImage(url, path.join(termOutputDir, `${index}.jpg`))
      )
    );

    await Promise.all(downloadTasks);

    // Remove duplicates
    await removeSimilarDuplicates(termOutputDir);

    console.log(`Completed processing for "${term}"`);
  }

  console.log("All operations completed successfully!");
};

main().catch((error) => {
  console.error("An error occurred:", error);
});
