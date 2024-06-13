import { Text, Alert, AlertIcon } from "@chakra-ui/react";

const SquareInfo = ({ width, height, imageWidth = 1000 }) => {
  const calculateTilesCount = () => {
    const area = imageWidth * imageWidth;
    const squareArea = width * height;
    return Math.floor(area / squareArea);
  };

  const tilesCount = calculateTilesCount();

  return (
    <Alert status="info" mb={4}>
      <AlertIcon />
      <Text>
        For {width}x{height} squares: <b>{tilesCount} tiles</b> are needed to
        fill a {imageWidth}x{imageWidth} area.
      </Text>
    </Alert>
  );
};

export default SquareInfo;
