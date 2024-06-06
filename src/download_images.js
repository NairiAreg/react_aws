const axios = require("axios");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp"); // **New library for image resizing**

const url = "https://thispersonnotexist.org/load-faces";
const payload = { type: "R" };

// **Ensure the "avatars" directory exists**
const avatarsDir = path.join(__dirname, "../public/imgs/AI avatars"); // **Path to the "avatars" directory**
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir); // **Create the directory if it doesn't exist**
}

// Function to download images
const downloadImages = async () => {
  for (let batch = 0; batch < 1300; batch++) {
    // **Loop to repeat the process 1000 times**
    try {
      const response = await axios.post(url, payload);

      if (response.status === 200) {
        const imageIds = response.data.fc;

        for (let index = 0; index < imageIds.length; index++) {
          const imageId = imageIds[index];
          const downloadUrl = `https://thispersonnotexist.org/downloadimage/${imageId}`;

          try {
            const imageResponse = await axios.get(downloadUrl, {
              responseType: "arraybuffer",
            });

            const filename = `${batch * 8 + index + 1 + 10400}.jpg`; // **Unique filename based on batch and index**
            const filePath = path.join(avatarsDir, filename); // **Full path to save the image**

            // **Resize the image and save it to the file**
            await sharp(imageResponse.data).resize(72, 72).toFile(filePath);

            console.log(`Downloaded and resized ${filename}`);
          } catch (err) {
            console.error(`Failed to download image with ID: ${imageId}`, err);
          }
        }
      } else {
        console.error(`Failed to load faces. Status code: ${response.status}`);
      }
    } catch (err) {
      console.error("Error during API request:", err);
    }
  }
};

// Run the function to download images
downloadImages();
