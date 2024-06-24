import fs from "fs";
import fetch from "node-fetch";
import sharp from "sharp";
import pLimit from "p-limit";
import Tesseract from "tesseract.js";

// Array of image URLs
import imageUrls from "./inputs/gray_cats.json" assert { type: "json" };

// Create a directory to store resized images
const directory = "./outputs/gray_cats";
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory);
}

// Function to check if the image contains text
const containsText = async (buffer) => {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => console.log(m), // Log progress if needed
    });
    return text.trim().length > 0;
  } catch (err) {
    console.error(`Error during OCR processing: ${err}`);
    return false;
  }
};

// Function to download and resize image
const downloadAndResizeImage = async (url, index) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const buffer = await response.buffer();

    // Check if the image contains text
    const hasText = await containsText(buffer);
    if (hasText) {
      console.log(`Image ${index} contains text and will be skipped.`);
      return;
    }

    const imageName = `${index}.jpg`;
    await sharp(buffer).resize(72, 72).toFile(`${directory}/${imageName}`);
    console.log(`Image ${imageName} resized and saved successfully!`);
  } catch (err) {
    console.error(`Error processing image ${index}: ${err}`);
  }
};

const limit = pLimit(5); // Limit concurrency to 5

// Download and resize all images with limited concurrency
const tasks = imageUrls.map((url, index) =>
  limit(() => downloadAndResizeImage(url, index))
);

// Wait for all tasks to complete
Promise.all(tasks)
  .then(() => console.log("All images processed successfully!"))
  .catch((err) => console.error("Error processing images:", err));
