import fs from "fs";
import fetch from "node-fetch";
import sharp from "sharp";
import pLimit from "p-limit";
import path from "path";
import { fileURLToPath } from "url";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the input file name from the command line argument
const inputFileName = process.argv[2];

if (!inputFileName) {
  console.error("Please provide an input file name as an argument.");
  process.exit(1);
}

// Construct the full path for the input JSON file
const inputFilePath = path.join(__dirname, "inputs", `${inputFileName}.json`);

// Read and parse the JSON file
let imageUrls;
try {
  const jsonData = await fs.promises.readFile(inputFilePath, "utf8");
  imageUrls = JSON.parse(jsonData);
} catch (err) {
  console.error(`Error reading or parsing the input file: ${err}`);
  process.exit(1);
}

// Create a directory to store resized images
const directory = path.join(__dirname, "outputs", inputFileName);
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory, { recursive: true });
}

// Function to download and resize image
const downloadAndResizeImage = async (url, index) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    const imageName = `${index}.jpg`;
    await sharp(Buffer.from(buffer))
      .trim()
      .resize(150, 150)
      .toFile(path.join(directory, imageName));
    console.log(`Image ${imageName} resized and saved successfully!`);
  } catch (err) {
    console.error(`Error processing image ${index}: ${err}`);
  }
};

const limit = pLimit(10); // Limit concurrency to 10

// Download and resize all images with limited concurrency
const tasks = imageUrls.map((url, index) =>
  limit(() => downloadAndResizeImage(url, index))
);

// Wait for all tasks to complete
try {
  await Promise.all(tasks);
  console.log("All images processed successfully!");
} catch (err) {
  console.error("Error processing images:", err);
}
