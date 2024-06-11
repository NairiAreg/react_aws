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

export const isTransparentAlphaChannel = (imageData, edgesCut) => {
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
