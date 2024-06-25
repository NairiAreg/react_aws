import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { imageHash } from 'image-hash';

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

// Main function to find and delete duplicates
const removeDuplicates = async (directory) => {
  try {
    const files = await fs.readdir(directory);
    const hashMap = new Map();

    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(10); // Limit concurrency to 10

    const tasks = files.map(file => limit(async () => {
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
    }));

    await Promise.all(tasks);
    console.log("Duplicate removal complete.");
  } catch (error) {
    console.error("Error reading directory:", error);
  }
};

// Start the process
removeDuplicates(directory).catch((error) => {
  console.error("Error:", error);
});