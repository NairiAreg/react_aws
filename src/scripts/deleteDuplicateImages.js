const fs = require("fs");
const path = require("path");
const { imageHash } = require("image-hash");

const directory = "./outputs/cats"; // Path to your images folder

// Function to hash image
const hashImage = (filePath) => {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

// Function to delete file
const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Failed to delete ${filePath}:`, err);
    } else {
      console.log(`Deleted duplicate: ${filePath}`);
    }
  });
};

// Main function to find and delete duplicates
const removeDuplicates = async (directory) => {
  const files = fs.readdirSync(directory);
  const hashMap = new Map();

  for (const file of files) {
    const filePath = path.join(directory, file);

    try {
      const hash = await hashImage(filePath);

      if (hashMap.has(hash)) {
        deleteFile(filePath);
      } else {
        hashMap.set(hash, filePath);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }

  console.log("Duplicate removal complete.");
};

// Start the process
removeDuplicates(directory).catch((error) => {
  console.error("Error:", error);
});
