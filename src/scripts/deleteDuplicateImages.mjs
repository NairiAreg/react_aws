import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { imageHash } from "image-hash";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get directory name from command line argument
const directoryName = process.argv[2];
if (!directoryName) {
  console.error("Please provide a directory name as an argument.");
  process.exit(1);
}

const directory = path.join(__dirname, "..", "scripts/outputs", directoryName);

// Function to hash image
const hashImage = (filePath) => {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
};

// Function to calculate Hamming distance between two hashes
const hammingDistance = (hash1, hash2) => {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
};

// Main function to find and delete similar duplicates
const removeSimilarDuplicates = async (directory) => {
  try {
    const files = await fs.readdir(directory);
    const hashMap = new Map();

    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(10); // Limit concurrency to 10

    // First, calculate hashes for all images
    const hashPromises = files.map((file) =>
      limit(async () => {
        const filePath = path.join(directory, file);
        try {
          const hash = await hashImage(filePath);
          return { file, hash, filePath };
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);
          return null;
        }
      })
    );

    const hashes = (await Promise.all(hashPromises)).filter(
      (result) => result !== null
    );

    // Then, compare hashes and remove similar images
    const similarityThreshold = 20; // Adjust this value to change sensitivity

    for (const { file, hash, filePath } of hashes) {
      let isSimilar = false;
      let originalFilePath = "";

      for (const [existingHash, existingFilePath] of hashMap.entries()) {
        const distance = hammingDistance(hash, existingHash);
        if (distance <= similarityThreshold) {
          isSimilar = true;
          originalFilePath = existingFilePath;
          break;
        }
      }

      if (isSimilar) {
        await fs.unlink(filePath);
        console.log(
          `Deleted similar image: ${filePath} which was similar to ${originalFilePath}`
        );
      } else {
        hashMap.set(hash, filePath);
      }
    }

    console.log("Similar image removal complete.");
  } catch (error) {
    console.error("Error reading directory:", error);
  }
};

// Start the process
removeSimilarDuplicates(directory).catch((error) => {
  console.error("Error:", error);
});
