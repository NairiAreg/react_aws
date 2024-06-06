import React, { useRef, useEffect, useState } from "react";
import ColorThief from "colorthief";
import { closest } from "color-diff";
import _ from "lodash";
import { ClipLoader } from "react-spinners";

const Mosaic = ({ targetImage, images }) => {
  const canvasRef = useRef(null);
  const [mosaicData, setMosaicData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const colorThief = new ColorThief();
    const gridSize = 5; // Smaller grid size for better quality

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

    const processChunk = async (imageChunk) => {
      const imgElements = await Promise.all(imageChunk.map(loadImage));
      const uniqueImgElements = _.uniqBy(imgElements, (img) => img.src);
      const colors = uniqueImgElements.map(getDominantColor);

      return { uniqueImgElements, colors };
    };

    const handleMosaic = async (
      targetData,
      canvasWidth,
      canvasHeight,
      colors,
      uniqueImgElements
    ) => {
      const mosaic = [];
      const usedImages = new Set(); // Track used images

      for (let y = 0; y < canvasHeight; y += gridSize) {
        for (let x = 0; x < canvasWidth; x += gridSize) {
          const i = (y * canvasWidth + x) * 4;
          const avgColor = {
            R: targetData[i],
            G: targetData[i + 1],
            B: targetData[i + 2],
          };

          let closestImgIndex = -1;
          let closestColor = null;
          let minDistance = Number.MAX_VALUE;

          // Find the closest color that hasn't been used yet
          colors.forEach((color, index) => {
            if (!usedImages.has(index)) {
              const distance = Math.sqrt(
                Math.pow(avgColor.R - color.R, 2) +
                  Math.pow(avgColor.G - color.G, 2) +
                  Math.pow(avgColor.B - color.B, 2)
              );
              if (distance < minDistance) {
                minDistance = distance;
                closestColor = color;
                closestImgIndex = index;
              }
            }
          });

          if (closestImgIndex !== -1) {
            usedImages.add(closestImgIndex);
            mosaic.push({ x, y, img: uniqueImgElements[closestImgIndex] });
          }

          // Break the loop if all images have been used
          if (usedImages.size >= uniqueImgElements.length) break;
        }
        // Break the loop if all images have been used
        if (usedImages.size >= uniqueImgElements.length) break;
      }
      setMosaicData((prevData) => [...prevData, ...mosaic]);
    };

    const processMosaic = async () => {
      try {
        setLoading(true);
        const targetImg = await loadImage(targetImage);
        ctx.drawImage(targetImg, 0, 0, canvas.width, canvas.height);
        const targetData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;

        const chunkSize = 100; // Adjust chunk size as needed
        for (let i = 0; i < images.length; i += chunkSize) {
          const imageChunk = images.slice(i, i + chunkSize);
          const { uniqueImgElements, colors } = await processChunk(imageChunk);
          await handleMosaic(
            targetData,
            canvas.width,
            canvas.height,
            colors,
            uniqueImgElements
          );
        }
      } catch (error) {
        console.error("Error processing images:", error);
      } finally {
        setLoading(false);
      }
    };

    processMosaic();
  }, [targetImage, images]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    mosaicData.forEach(({ x, y, img }) => {
      const imgElement = new Image();
      imgElement.crossOrigin = "Anonymous";
      imgElement.src = img.src;
      imgElement.onload = () => {
        ctx.drawImage(imgElement, x, y, 5, 5);
      };
    });
  }, [mosaicData]);

  return (
    <div>
      {loading && <ClipLoader size={150} color={"#123abc"} loading={loading} />}
      <canvas ref={canvasRef} width={5000} height={5000} />
    </div>
  );
};

export default Mosaic;
