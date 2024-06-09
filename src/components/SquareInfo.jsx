import { Text, Alert, AlertIcon } from "@chakra-ui/react";

const SquareInfo = ({ width, height }) => {
  const calculateTilesCount = () => {
    const area = 1000 * 1000;
    const squareArea = width * height;
    return Math.floor(area / squareArea);
  };

  const tilesCount = calculateTilesCount();

  return (
    <Alert status="info" mb={4}>
      <AlertIcon />
      <Text>
        For {width}x{height} squares: <b>{tilesCount} tiles</b> are needed to
        fill a 1000x1000 area.
      </Text>
    </Alert>
  );
};

export default SquareInfo;
