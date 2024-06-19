import Chart from "chart.js/auto";

export const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const getAverageColor = (data) => {
  let r = 0,
    g = 0,
    b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const pixelCount = data.length / 4;
  return {
    r: Math.round(r / pixelCount),
    g: Math.round(g / pixelCount),
    b: Math.round(b / pixelCount),
  };
};

export const findBestMatchTileIndex = (color, tiles) => {
  let minDistance = Infinity;
  let bestMatchIndex = 0;
  for (let i = 0; i < tiles.length; i++) {
    const tileColor = tiles[i].color;
    const distance = colorDistance(color, tileColor);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatchIndex = i;
    }
  }
  return bestMatchIndex;
};

const colorDistance = (color1, color2) => {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
  );
};

export const isTransparentAlphaChannel = (imageData, edgesCut = 0) => {
  const pixels = imageData.data;
  for (let i = 3; i < pixels?.length || 0; i += 4) {
    if (pixels[i] < edgesCut) {
      return true;
    }
  }
  return false;
};

// Helper function to group similar colors
export const groupColors = (colors, tolerance = 10) => {
  const groups = {};

  const isColorSimilar = (color1, color2, tolerance) => {
    const deltaE = Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
        Math.pow(color1.g - color2.g, 2) +
        Math.pow(color1.b - color2.b, 2)
    );
    return deltaE < tolerance;
  };

  for (const color of colors) {
    let found = false;
    for (const key in groups) {
      const groupColor = JSON.parse(key);
      if (isColorSimilar(color, groupColor, tolerance)) {
        groups[key]++;
        found = true;
        break;
      }
    }
    if (!found) {
      groups[JSON.stringify(color)] = 1;
    }
  }

  const sortedGroups = Object.entries(groups).sort(
    ([, countA], [, countB]) => countB - countA
  );

  return sortedGroups.map(([key, count]) => ({
    color: JSON.parse(key),
    count,
  }));
};

export const createColorChart = (stats, id) => {
  const ctx = document.getElementById(id).getContext("2d");
  if (window.colorChartInstance) {
    window.colorChartInstance.destroy();
  }
  window.colorChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: stats.map(
        (stat) => `rgb(${stat.color.r},${stat.color.g},${stat.color.b})`
      ),
      datasets: [
        {
          label: "# of Tiles",
          data: stats.map((stat) => stat.count),
          backgroundColor: stats.map(
            (stat) => `rgb(${stat.color.r},${stat.color.g},${stat.color.b})`
          ),
        },
      ],
    },
  });
};

// Utility function to blend two colors
export const blendColors = (color1, color2, factor) => {
  const r = Math.round(color1.r * (1 - factor) + color2.r * factor);
  const g = Math.round(color1.g * (1 - factor) + color2.g * factor);
  const b = Math.round(color1.b * (1 - factor) + color2.b * factor);
  return { r, g, b };
};

// Calculate color difference function
export const colorDifference = (color1, color2) => {
  return (
    Math.abs(color1.r - color2.r) +
    Math.abs(color1.g - color2.g) +
    Math.abs(color1.b - color2.b)
  );
};

// Helper function to correct and draw a tile
export const correctAndDrawTile = (
  tile,
  avgColor,
  x,
  y,
  mosaicCtx,
  tileWidth,
  tileHeight,
  correctionFactor,
  mainCtx,
  flip
) => {
  const correctedColor = blendColors(tile.color, avgColor, correctionFactor);

  // Create a temporary canvas to apply color correction
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = tileWidth;
  tempCanvas.height = tileHeight;
  const tempCtx = tempCanvas.getContext("2d");

  // Draw the original tile on the temporary canvas
  tempCtx.drawImage(tile.canvas, 0, 0, tileWidth, tileHeight);

  // Apply color correction
  const imageData = tempCtx.getImageData(0, 0, tileWidth, tileHeight);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = Math.min(
      255,
      imageData.data[i] + (correctedColor.r - tile.color.r)
    );
    imageData.data[i + 1] = Math.min(
      255,
      imageData.data[i + 1] + (correctedColor.g - tile.color.g)
    );
    imageData.data[i + 2] = Math.min(
      255,
      imageData.data[i + 2] + (correctedColor.b - tile.color.b)
    );
  }
  tempCtx.putImageData(imageData, 0, 0);

  // Get 2 horizontal halves of main image tile
  const mainImageTileAvg1 = getAverageColor(
    mainCtx.getImageData(x, y, tileWidth / 2, tileHeight).data
  );
  const mainImageTileAvg2 = getAverageColor(
    mainCtx.getImageData(x + tileWidth / 2, y, tileWidth / 2, tileHeight).data
  );

  // Get 2 horizontal halves of candidate tile (corrected)
  const candidateTileAvg1 = getAverageColor(
    tempCtx.getImageData(0, 0, tileWidth / 2, tileHeight).data
  );
  const candidateTileAvg2 = getAverageColor(
    tempCtx.getImageData(tileWidth / 2, 0, tileWidth / 2, tileHeight).data
  );

  if (flip) {
    // Create a temporary canvas for the flipped tile
    const flippedCanvas = document.createElement("canvas");
    flippedCanvas.width = tileWidth;
    flippedCanvas.height = tileHeight;
    const flippedCtx = flippedCanvas.getContext("2d");

    // Draw the flipped tile on the temporary canvas
    flippedCtx.translate(tileWidth, 0);
    flippedCtx.scale(-1, 1);
    flippedCtx.drawImage(tempCanvas, 0, 0, tileWidth, tileHeight);

    // Get 2 horizontal halves of flipped tile
    const flippedTileAvg1 = getAverageColor(
      flippedCtx.getImageData(0, 0, tileWidth / 2, tileHeight).data
    );
    const flippedTileAvg2 = getAverageColor(
      flippedCtx.getImageData(tileWidth / 2, 0, tileWidth / 2, tileHeight).data
    );

    // Calculate total differences for original and flipped states
    const originalDifference =
      colorDifference(mainImageTileAvg1, candidateTileAvg1) +
      colorDifference(mainImageTileAvg2, candidateTileAvg2);

    const flippedDifference =
      colorDifference(mainImageTileAvg1, flippedTileAvg1) +
      colorDifference(mainImageTileAvg2, flippedTileAvg2);

    // Draw the best fitting tile on the mosaic canvas
    if (flippedDifference < originalDifference) {
      mosaicCtx.drawImage(flippedCanvas, x, y, tileWidth, tileHeight);
      return;
    }
  }

  // Draw the corrected tile on the mosaic canvas if not flipping
  mosaicCtx.drawImage(tempCanvas, x, y, tileWidth, tileHeight);
};
export const generateSpiralOrder = (totalTilesX, totalTilesY) => {
  const spiralOrder = [];
  // Spiral order directions (right, down, left, up)
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
  ];

  // Initialize the starting point at the center of the grid
  let cx = Math.floor(totalTilesX / 2);
  let cy = Math.floor(totalTilesY / 2);

  // Generate the spiral order
  let x = cx;
  let y = cy;
  let directionIndex = 0;
  let stepSize = 1;
  let stepsInCurrentDirection = 0;

  while (spiralOrder.length < totalTilesX * totalTilesY) {
    if (x >= 0 && x < totalTilesX && y >= 0 && y < totalTilesY) {
      spiralOrder.push({ x, y });
    }
    x += directions[directionIndex].dx;
    y += directions[directionIndex].dy;
    stepsInCurrentDirection++;

    if (stepsInCurrentDirection === stepSize) {
      directionIndex = (directionIndex + 1) % 4;
      stepsInCurrentDirection = 0;
      if (directionIndex === 0 || directionIndex === 2) {
        stepSize++;
      }
    }
  }

  return spiralOrder;
};

export const generateRandomOrder = (totalTilesX, totalTilesY) => {
  const randomOrder = [];

  // Generate all tile positions
  for (let y = 0; y < totalTilesY; y++) {
    for (let x = 0; x < totalTilesX; x++) {
      randomOrder.push({ x, y });
    }
  }

  // Shuffle the array
  for (let i = randomOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [randomOrder[i], randomOrder[j]] = [randomOrder[j], randomOrder[i]];
  }

  return randomOrder;
};

export const generateTopLeftToBottomRightOrder = (totalTilesX, totalTilesY) => {
  const order = [];
  for (let y = 0; y < totalTilesY; y++) {
    for (let x = 0; x < totalTilesX; x++) {
      order.push({ x, y });
    }
  }
  return order;
};
export const generateBottomRightToTopLeftOrder = (totalTilesX, totalTilesY) => {
  const order = [];
  for (let y = totalTilesY - 1; y >= 0; y--) {
    for (let x = totalTilesX - 1; x >= 0; x--) {
      order.push({ x, y });
    }
  }
  return order;
};
