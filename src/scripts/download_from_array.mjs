import fs from "fs";
import fetch from "node-fetch";
import sharp from "sharp";
import pLimit from "p-limit";

// Array of image URLs
import imageUrls from "./inputs/cats.json" assert { type: "json" };

// Create a directory to store resized images
const directory = "./outputs/cats";
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory);
}

// Function to download and resize image
const downloadAndResizeImage = async (url, index) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const buffer = await response.buffer();

    const imageName = `${index}.jpg`;
    await sharp(buffer).resize(72, 72).toFile(`${directory}/${imageName}`);
    console.log(`Image ${imageName} resized and saved successfully!`);
  } catch (err) {
    console.error(`Error processing image ${index}: ${err}`);
  }
};

const limit = pLimit(10); // Limit concurrency to 5

// Download and resize all images with limited concurrency
const tasks = imageUrls.map((url, index) =>
  limit(() => downloadAndResizeImage(url, index))
);

// Wait for all tasks to complete
Promise.all(tasks)
  .then(() => console.log("All images processed successfully!"))
  .catch((err) => console.error("Error processing images:", err));
