import React from "react";
import { Flex, Image } from "@chakra-ui/react";
import {
  flickrCats,
  flickrFlowers,
  flickrGrayCats,
  flickrImages,
  flickrSquareGrayCats,
  googleImages,
  pexelImages,
  unsplashImages,
} from "utils/constatns";
function ImageGallery() {
  return (
    <Flex
      p={5}
      mt={5}
      justify="center"
      direction="row"
      wrap="wrap"
      alignItems="center"
      gap={4} // Add some gap between images
    >
      {flickrSquareGrayCats.map((url) => (
        <Image
          key={url}
          src={url}
          alt={`Image ${url + 1}`}
          maxW="none"
          maxH="none"
          objectFit="contain"
        />
      ))}
    </Flex>
  );
}

export default ImageGallery;
