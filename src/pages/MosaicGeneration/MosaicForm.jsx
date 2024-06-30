// MosaicForm.js
import React from "react";
import {
  Box,
  Button,
  Input,
  FormControl,
  FormLabel,
  Progress,
  VStack,
  HStack,
  Heading,
  Flex,
  Text,
  IconButton,
  Alert,
  AlertIcon,
  Checkbox,
  RadioGroup,
  Stack,
  Radio,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FaFileUpload } from "react-icons/fa";
import SquareInfo from "components/SquareInfo";
import CustomSlider from "components/CustomSlider";
import TicTacToeBoard from "components/TicTacToeBoard";

const MosaicForm = ({
  handleMainImageChange,
  handleTileImagesChange,
  loadImagesFromDirectory,
  reuseTilesCount,
  setReuseTilesCount,
  flip,
  setFlip,
  orderType,
  setOrderType,
  drawInterval,
  setDrawInterval,
  radius,
  setRadius,
  edgesCut,
  setEdgesCut,
  tileWidth,
  setTileWidth,
  tileHeight,
  setTileHeight,
  imageWidth,
  setImageWidth,
  handleSubmit,
  isLoading,
  mainImage,
  imageFiles,
  drawnTilesState,
  colorCorrection,
  progress,
  tiles,
  setColorCorrection,
  tolerance,
  setTolerance,
  usageQuantity,
  setUsageQuantity,
}) => {
  return (
    <VStack spacing={5} maxW="600px" mx="auto">
      <Heading>Mosaic Image Generator</Heading>
      <FormControl id="mainImage">
        <FormLabel>Main Image</FormLabel>
        <Box border="1px dashed" borderColor="gray.300" p={3} borderRadius="md">
          <Flex align="center">
            <IconButton
              icon={<FaFileUpload />}
              aria-label="Upload Main Image"
              as="label"
              htmlFor="main-image-input"
              colorScheme="teal"
              variant="outline"
            />
            <Input
              id="main-image-input"
              type="file"
              onChange={handleMainImageChange}
              hidden
            />
            <Text ml={3}>
              {mainImage ? mainImage.name : "Click to upload main image"}
            </Text>
          </Flex>
        </Box>
      </FormControl>
      <FormControl id="tileImages">
        <FormLabel>Tile Images</FormLabel>
        <Box border="1px dashed" borderColor="gray.300" p={3} borderRadius="md">
          <Flex align="center">
            <IconButton
              icon={<FaFileUpload />}
              aria-label="Upload Tile Images"
              as="label"
              htmlFor="tile-images-input"
              colorScheme="teal"
              variant="outline"
            />
            <Input
              id="tile-images-input"
              type="file"
              multiple
              onChange={handleTileImagesChange}
              hidden
            />
            <Text ml={3}>
              {imageFiles.length > 0
                ? `${tiles.length} files selected`
                : "Click to upload tile images"}
            </Text>
          </Flex>
        </Box>
      </FormControl>
      <Flex gap={2} alignItems="center">
        Load
        {[50, 100, 200, 500, 1000, 5000].map((count) => (
          <Button
            key={count}
            onClick={() => loadImagesFromDirectory(count)}
            isLoading={isLoading}
          >
            {count}
          </Button>
        ))}
        Images
      </Flex>
      <HStack spacing={5}>
        <FormControl id="tileWidth">
          <FormLabel>Tile Width</FormLabel>
          <Input
            type="number"
            value={tileWidth}
            onChange={(e) => setTileWidth(e.target.value)}
          />
        </FormControl>
        <FormControl id="tileHeight">
          <FormLabel>Tile Height</FormLabel>
          <Input
            type="number"
            value={tileHeight}
            onChange={(e) => setTileHeight(e.target.value)}
          />
        </FormControl>
        <FormControl id="tileHeight">
          <FormLabel>Image width</FormLabel>
          <Input
            type="number"
            value={imageWidth}
            onChange={(e) => setImageWidth(e.target.value)}
          />
        </FormControl>
      </HStack>
      <SquareInfo
        width={tileWidth}
        height={tileHeight}
        imageWidth={imageWidth}
      />
      {drawnTilesState > 0 && (
        <Alert status="success">
          <AlertIcon />
          Used {drawnTilesState} tiles to create the mosaic.
        </Alert>
      )}
      <FormControl id="reuseCount">
        <FormLabel>
          Reuse Count: {reuseTilesCount > 0 ? reuseTilesCount : "Infinity"}
        </FormLabel>
        <CustomSlider
          max={100}
          value={reuseTilesCount}
          onChange={(value) => setReuseTilesCount(value)}
          thumbColor="teal.500"
        />
      </FormControl>

      <FormControl id="drawAnimation">
        <FormLabel>
          Draw animation: {drawInterval > 0 ? drawInterval : "None"}
        </FormLabel>
        <CustomSlider
          max={100}
          value={drawInterval}
          onChange={(value) => setDrawInterval(value)}
          thumbColor="blue.500"
        />
      </FormControl>

      <FormControl id="adjacentBlockingRadius">
        <FormLabel>Adjacent blocking radius: {radius}</FormLabel>
        <CustomSlider
          max={10}
          value={radius}
          onChange={(value) => setRadius(value)}
          thumbColor="red.500"
        />
      </FormControl>

      <TicTacToeBoard size={1 + radius * 2} />

      <FormControl id="colorCorrection">
        <FormLabel>Color correction: {colorCorrection * 100}%</FormLabel>
        <CustomSlider
          step={0.1}
          max={1}
          value={colorCorrection}
          onChange={(value) => setColorCorrection(value)}
          thumbColor="teal.500"
        />
      </FormControl>
      <FormControl id="flipToggle">
        <Checkbox
          isChecked={flip}
          onChange={(e) => setFlip(e.target.checked)}
          colorScheme="teal"
        >
          Flip Tiles
        </Checkbox>
      </FormControl>
      <FormControl as="fieldset">
        <FormLabel as="legend">Select Tile Drawing Order</FormLabel>
        <RadioGroup onChange={setOrderType} value={orderType}>
          <Stack direction="row">
            <Radio value="spiral">Spiral 🌀</Radio>
            <Radio value="random">Random 🎲</Radio>
            <Radio value="top-bottom">Top to bottom ↘︎</Radio>
            <Radio value="bottom-top">Bottom to top ↖️</Radio>
          </Stack>
        </RadioGroup>
      </FormControl>
      <FormControl id="colorTolerance">
        <FormLabel>Color tolerance: {tolerance}</FormLabel>
        <CustomSlider
          max={100}
          value={tolerance}
          onChange={(value) => setTolerance(value)}
          thumbColor="blue.500"
        />
      </FormControl>
      <FormControl id="usageQuantity">
        <FormLabel>Usage Quantity: {usageQuantity}</FormLabel>
        <CustomSlider
          max={100}
          value={usageQuantity}
          onChange={(value) => setUsageQuantity(value)}
          thumbColor="red.500"
        />
      </FormControl>
      <FormControl id="cutFromEdges">
        <FormLabel>Cut from edges: {edgesCut}</FormLabel>
        <CustomSlider
          min={1}
          max={255}
          value={edgesCut}
          onChange={(value) => setEdgesCut(value)}
          thumbColor="yellow.500"
        />
        <Box
          w="200px"
          h="200px"
          borderColor="tomato"
          bg="black"
          borderStyle="solid"
          borderWidth={`${edgesCut / 10}px`}
          mx="auto"
          mt={2}
        />
      </FormControl>
      {isLoading && <Progress value={progress} size="lg" w="100%" />}
      <Button colorScheme="teal" onClick={handleSubmit} isLoading={isLoading}>
        Create Mosaic
      </Button>
    </VStack>
  );
};

export default MosaicForm;
