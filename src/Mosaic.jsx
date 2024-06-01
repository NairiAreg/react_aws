import React, { useRef, useEffect, useState } from "react";
import ColorThief from "colorthief";
import { closest } from "color-diff";
// import _ from "lodash";

const Mosaic = ({ targetImage, images }) => {
  const canvasRef = useRef(null);
  const [mosaicData, setMosaicData] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const colorThief = new ColorThief();

    const loadImage = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.src = src;
      });
    };

    const getDominantColor = (img) => {
      const color = colorThief.getColor(img);
      return { R: color[0], G: color[1], B: color[2] };
    };

    const processImages = async () => {
      const imgElements = await Promise.all(images.map(loadImage));
      const colors = imgElements.map(getDominantColor);

      const targetImg = await loadImage(targetImage);
      ctx.drawImage(targetImg, 0, 0, canvas.width, canvas.height);
      const targetData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;

      const gridSize = 10; // Size of each tile
      const mosaic = [];
      for (let y = 0; y < canvas.height; y += gridSize) {
        for (let x = 0; x < canvas.width; x += gridSize) {
          const i = (y * canvas.width + x) * 4;
          const avgColor = {
            R: targetData[i],
            G: targetData[i + 1],
            B: targetData[i + 2],
          };

          const closestColor = closest(avgColor, colors);
          const closestImgIndex = colors.indexOf(closestColor);
          mosaic.push({ x, y, img: imgElements[closestImgIndex] });
        }
      }
      setMosaicData(mosaic);
    };

    processImages();
  }, [targetImage, images]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    mosaicData.forEach(({ x, y, img }) => {
      ctx.drawImage(img, x, y, 10, 10);
    });
  }, [mosaicData]);

  return <canvas ref={canvasRef} width={2000} height={2000}></canvas>;
};

export default Mosaic;
