import React, { useState, useEffect } from "react";
import pica from "pica";

function App() {
  const [mainImage, setMainImage] = useState(null);
  const [mainImageURL, setMainImageURL] = useState(null); // State to store the main image URL
  const [imageFiles, setImageFiles] = useState([]);
  const [tileWidth, setTileWidth] = useState(10);
  const [tileHeight, setTileHeight] = useState(10);
  const [mosaicImage, setMosaicImage] = useState(null);
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    if (imageFiles.length > 0) {
      loadTiles();
    }
  }, [imageFiles]);

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    setMainImage(file);
    setMainImageURL(URL.createObjectURL(file)); // Create a URL for the main image file
  };

  const handleTileImagesChange = (e) => {
    setImageFiles(Array.from(e.target.files));
  };

  const loadTiles = async () => {
    const tileImages = await Promise.all(
      imageFiles.map((file) => loadImage(file))
    );
    setTiles(tileImages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mainImage || tiles.length === 0) return;

    const mosaic = await createMosaic(
      mainImage,
      tiles,
      +tileWidth,
      +tileHeight
    );
    setMosaicImage(mosaic);
  };

  const createMosaic = async (mainImageFile, tiles, tileWidth, tileHeight) => {
    const mainImg = await loadImage(mainImageFile);
    const mainCanvas = document.createElement("canvas");
    const mainCtx = mainCanvas.getContext("2d", { willReadFrequently: true });

    mainCanvas.width = mainImg.width;
    mainCanvas.height = mainImg.height;
    mainCtx.drawImage(mainImg, 0, 0);

    const mosaicCanvas = document.createElement("canvas");
    mosaicCanvas.width = mainCanvas.width;
    mosaicCanvas.height = mainCanvas.height;
    const mosaicCtx = mosaicCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    const picaInstance = pica();

    const tileCanvases = await Promise.all(
      tiles.map((tile) => {
        const tileCanvas = document.createElement("canvas");
        tileCanvas.width = tileWidth;
        tileCanvas.height = tileHeight;
        const tileCtx = tileCanvas.getContext("2d", {
          willReadFrequently: true,
        });
        return picaInstance.resize(tile, tileCanvas).then(() => {
          return {
            canvas: tileCanvas,
            color: getAverageColor(
              tileCtx.getImageData(0, 0, tileWidth, tileHeight).data
            ),
          };
        });
      })
    );

    const availableTiles = [...tileCanvases];

    for (let y = 0; y < mainCanvas.height; y += tileHeight) {
      for (let x = 0; x < mainCanvas.width; x += tileWidth) {
        if (availableTiles.length === 0) {
          console.warn("Not enough unique tiles to fill the mosaic.");
          break;
        }

        const { data } = mainCtx.getImageData(x, y, tileWidth, tileHeight);
        const avgColor = getAverageColor(data);
        const bestMatchIndex = findBestMatchTileIndex(avgColor, availableTiles);
        const bestMatchTile = availableTiles[bestMatchIndex];

        mosaicCtx.drawImage(bestMatchTile.canvas, x, y, tileWidth, tileHeight);

        //? Remove the used tile from the available tiles
        // availableTiles.splice(bestMatchIndex, 1);
      }
    }

    return new Promise((resolve) => {
      mosaicCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, "image/jpeg");
    });
  };

  const loadImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const getAverageColor = (data) => {
    let r = 0,
      g = 0,
      b = 0;
    const count = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    return { r: r / count, g: g / count, b: b / count };
  };

  const findBestMatchTileIndex = (avgColor, tileCanvases) => {
    let bestMatchIndex = 0;
    let bestMatchDistance = Infinity;

    tileCanvases.forEach((tile, index) => {
      const distance = colorDistance(avgColor, tile.color);
      if (distance < bestMatchDistance) {
        bestMatchDistance = distance;
        bestMatchIndex = index;
      }
    });

    return bestMatchIndex;
  };

  const colorDistance = (color1, color2) => {
    return Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
        Math.pow(color1.g - color2.g, 2) +
        Math.pow(color1.b - color2.b, 2)
    );
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit}>
        <div>
          <label>Main Image:</label>
          <input type="file" onChange={handleMainImageChange} />
        </div>
        <div>
          <label>Tile Images:</label>
          <input type="file" multiple onChange={handleTileImagesChange} />
        </div>
        <div>
          <label>Tile Width:</label>
          <input
            type="number"
            value={tileWidth}
            onChange={(e) => setTileWidth(e.target.value)}
          />
        </div>
        <div>
          <label>Tile Height:</label>
          <input
            type="number"
            value={tileHeight}
            onChange={(e) => setTileHeight(e.target.value)}
          />
        </div>
        <button type="submit">Create Mosaic</button>
      </form>
      {mosaicImage && (
        <div>
          <h2>Mosaic Image</h2>
          {mainImageURL && <img src={mainImageURL} alt="Main" />}{" "}
          <img src={mosaicImage} alt="Mosaic" />
        </div>
      )}
    </div>
  );
}

export default App;
