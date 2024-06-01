import React from "react";
import Mosaic from "./Mosaic";

const App = () => {
  const targetImage = "./imgs/target.jpeg";

  const images = [];
  for (let i = 1; i <= 5000; i++) {
    images.push(`./imgs/avatars/avatar_${i}.jpg`);
  }
  // console.log(images);

  return (
    <div>
      <h1>Photo Mosaic</h1>
      <img src={targetImage} alt="" />
      <Mosaic targetImage={targetImage} images={images} />
    </div>
  );
};

export default App;
