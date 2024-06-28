import fs from "fs/promises";
import path from "path";
import { imageHash } from "image-hash";

// Get directory path from command line argument
const directoryPath = process.argv[2];
if (!directoryPath) {
  console.error("Please provide an absolute directory path as an argument.");
  process.exit(1);
}

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
    console.log(`Processing directory: ${directory}`);

    // Check if directory exists and is accessible
    await fs.access(directory);

    const files = await fs.readdir(directory);
    console.log(`Found ${files.length} files in the directory.`);

    const hashMap = new Map();

    const pLimit = (await import("p-limit")).default;
    const limit = pLimit(10); // Limit concurrency to 10

    // First, calculate hashes for all images
    const hashPromises = files.map((file) =>
      limit(async () => {
        const filePath = path.join(directory, file);
        try {
          // Check if it's a file (not a directory) and has an image extension
          const stats = await fs.stat(filePath);
          const isImage = [".jpg", ".jpeg", ".png", ".gif", ".bmp"].includes(
            path.extname(file).toLowerCase()
          );
          if (stats.isFile() && isImage) {
            console.log(`Processing image: ${filePath}`);
            const hash = await hashImage(filePath);
            return { file, hash, filePath };
          } else {
            console.log(`Skipping non-image file: ${filePath}`);
            return null;
          }
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);
          return null;
        }
      })
    );

    const hashes = (await Promise.all(hashPromises)).filter(
      (result) => result !== null
    );

    console.log(`Processed ${hashes.length} images.`);

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
    console.error("Error processing directory:", error);
  }
};

// Start the process
removeSimilarDuplicates(directoryPath).catch((error) => {
  console.error("Error:", error);
});
