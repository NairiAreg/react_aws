import fs from "fs";
import fetch from "node-fetch";
import sharp from "sharp";

// Array of image URLs
import imageUrls from "./inputs/gev_friends.json" assert { type: "json" };

// Create a directory to store resized images
const directory = "./gev_friends";
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

// Download and resize all images
imageUrls.forEach((url, index) => {
  downloadAndResizeImage(url, index);
});
