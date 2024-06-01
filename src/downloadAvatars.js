const axios = require("axios");
const fs = require("fs");
const path = require("path");

const downloadAvatar = async (url, filepath) => {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  return new Promise((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(filepath))
      .on("finish", () => resolve())
      .on("error", (e) => reject(e));
  });
};

const downloadAvatars = async (count) => {
  const usersEndpoint = `https://randomuser.me/api/?results=${count}&inc=picture`;
  const saveDir = path.join(__dirname, "avatars");

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir);
  }

  try {
    const { data } = await axios.get(usersEndpoint);
    const avatars = data.results.map((user) => user.picture.medium);

    const downloadPromises = avatars.map((url, index) => {
      const filepath = path.join(saveDir, `avatar_${index + 1}.jpg`);
      return downloadAvatar(url, filepath);
    });

    await Promise.all(downloadPromises);
    console.log(`${count} avatars downloaded successfully.`);
  } catch (error) {
    console.error("Error downloading avatars:", error);
  }
};

downloadAvatars(5000);
