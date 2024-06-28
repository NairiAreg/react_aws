import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  Input,
  Image,
  VStack,
  HStack,
  Text,
  IconButton,
  Progress,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react";
import { CloseIcon, DownloadIcon } from "@chakra-ui/icons";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const API_KEY = process.env.REACT_APP_API_KEY;
const API_URL = process.env.REACT_APP_API_URL;
const PER_PAGE = process.env.REACT_APP_PER_PAGE;
const MAX_PAGES = process.env.REACT_APP_MAX_PAGES;
const IMAGES_PER_PAGE = process.env.REACT_APP_IMAGES_PER_PAGE;

const ProgressBar = ({ progress }) => (
  <Box
    bg="gray.100"
    borderRadius="full"
    p={1}
    mb={4}
    boxShadow="md"
    width="100%"
    position="relative"
  >
    <Progress
      value={progress}
      colorScheme="blue"
      height="20px"
      borderRadius="full"
    />
    <Text
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      fontSize="sm"
      fontWeight="bold"
    >
      {progress}%
    </Text>
  </Box>
);

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = [];
  for (
    let i = Math.max(1, currentPage - 5);
    i <= Math.min(totalPages, currentPage + 5);
    i++
  ) {
    pageNumbers.push(i);
  }

  return (
    <HStack spacing={2} mt={4} justifyContent="center">
      <Button onClick={() => onPageChange(1)} isDisabled={currentPage === 1}>
        First
      </Button>
      <Button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        isDisabled={currentPage === 1}
      >
        Prev
      </Button>
      {pageNumbers.map((number) => (
        <Button
          key={number}
          onClick={() => onPageChange(number)}
          colorScheme={currentPage === number ? "blue" : "gray"}
        >
          {number}
        </Button>
      ))}
      <Button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        isDisabled={currentPage === totalPages}
      >
        Next
      </Button>
      <Button
        onClick={() => onPageChange(totalPages)}
        isDisabled={currentPage === totalPages}
      >
        Last
      </Button>
      <Input
        placeholder="Go to page"
        width="100px"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const page = parseInt(e.target.value);
            if (page >= 1 && page <= totalPages) {
              onPageChange(page);
            }
          }
        }}
      />
    </HStack>
  );
};

const App = () => {
  const [searchTerms, setSearchTerms] = useState("");
  const [searchResults, setSearchResults] = useState({});
  const [unselectedImages, setUnselectedImages] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [currentPages, setCurrentPages] = useState({});
  const [isDownloading, setIsDownloading] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState(0);

  const fetchFlickrImages = async (text, page = 1) => {
    const response = await fetch(
      `${API_URL}?method=flickr.photos.search&api_key=${API_KEY}&text=${encodeURIComponent(
        text
      )}&format=json&nojsoncallback=1&per_page=${PER_PAGE}&page=${page}&content_type=1&sort=relevance&safe_search=1`
    );
    const data = await response.json();
    return {
      photos: data.photos.photo.map(
        (photo) =>
          `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`
      ),
      totalPages: data.photos.pages,
    };
  };

  const resizeAndCropImage = async (imageUrl) => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");

    const scale = Math.max(
      canvas.width / imageBitmap.width,
      canvas.height / imageBitmap.height
    );
    const x = canvas.width / 2 - (imageBitmap.width / 2) * scale;
    const y = canvas.height / 2 - (imageBitmap.height / 2) * scale;
    ctx.drawImage(
      imageBitmap,
      x,
      y,
      imageBitmap.width * scale,
      imageBitmap.height * scale
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setProgress(0);
    setTotalImages(0);
    const terms = searchTerms
      .split(",")
      .map((term) => term.trim())
      .filter((term) => term !== "");
    const results = {};

    let totalProgress = 0;
    let overallTotalPages = 0;

    for (const term of terms) {
      let allUrls = new Set();
      let page = 1;
      let termTotalPages = 0;

      while (page <= MAX_PAGES) {
        const { photos, totalPages } = await fetchFlickrImages(term, page);
        photos.forEach((url) => allUrls.add(url));
        totalProgress++;
        setProgress(
          Math.round((totalProgress / (terms.length * MAX_PAGES)) * 100)
        );

        if (page === 1) {
          termTotalPages = Math.min(totalPages, MAX_PAGES);
          overallTotalPages += termTotalPages;
        }

        if (page >= termTotalPages) break;
        page++;
      }

      results[term] = Array.from(allUrls);
      console.log(
        `Fetched ${results[term].length} images for "${term}" in ${termTotalPages} pages`
      );
    }

    setSearchResults(results);
    setUnselectedImages(Object.fromEntries(terms.map((term) => [term, []])));
    const total = Object.values(results).reduce(
      (sum, urls) => sum + urls.length,
      0
    );
    setTotalImages(total);
    setCurrentPages(Object.fromEntries(terms.map((term) => [term, 1])));
    setIsLoading(false);

    console.log(`Total pages fetched: ${overallTotalPages}`);
  };

  const handleImageToggle = (term, imageUrl) => {
    setUnselectedImages((prev) => ({
      ...prev,
      [term]: prev[term].includes(imageUrl)
        ? prev[term].filter((url) => url !== imageUrl)
        : [...prev[term], imageUrl],
    }));
  };

  const handleDownload = async (term) => {
    setIsDownloading((prev) => ({ ...prev, [term]: true }));
    setDownloadProgress((prev) => ({ ...prev, [term]: 0 }));
    const zip = new JSZip();
    const folder = zip.folder(term);

    const urls = searchResults[term].filter(
      (url) => !unselectedImages[term].includes(url)
    );
    const totalImages = urls.length;

    const processBatch = async (startIndex, batchSize) => {
      const endIndex = Math.min(startIndex + batchSize, urls.length);
      const batch = urls.slice(startIndex, endIndex);

      const batchPromises = batch.map(async (url, index) => {
        try {
          const resizedBlob = await resizeAndCropImage(url);
          return { blob: resizedBlob, index: startIndex + index };
        } catch (error) {
          console.error(`Failed to download image: ${url}`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter((result) => result !== null);

      for (const { blob, index } of validResults) {
        folder.file(`image_${index + 1}.jpg`, blob);
      }

      const processedImages = endIndex;
      setDownloadProgress((prev) => ({
        ...prev,
        [term]: Math.round((processedImages / totalImages) * 100),
      }));

      if (endIndex < urls.length) {
        await processBatch(endIndex, batchSize);
      }
    };

    await processBatch(0, 10);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${term}_images.zip`);
    setIsDownloading((prev) => ({ ...prev, [term]: false }));
  };

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    setDownloadAllProgress(0);
    const zip = new JSZip();

    const allTerms = Object.keys(searchResults);
    let totalImages = 0;
    let processedImages = 0;

    allTerms.forEach((term) => {
      totalImages += searchResults[term].filter(
        (url) => !unselectedImages[term].includes(url)
      ).length;
    });

    for (const term of allTerms) {
      const folder = zip.folder(term);
      const urls = searchResults[term].filter(
        (url) => !unselectedImages[term].includes(url)
      );

      for (let i = 0; i < urls.length; i++) {
        try {
          const resizedBlob = await resizeAndCropImage(urls[i]);
          folder.file(`image_${i + 1}.jpg`, resizedBlob);
          processedImages++;
          setDownloadAllProgress(
            Math.round((processedImages / totalImages) * 100)
          );
        } catch (error) {
          console.error(`Failed to download image: ${urls[i]}`, error);
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "all_images.zip");
    setIsDownloadingAll(false);
  };

  return (
    <Container maxW="container.xl" py={5}>
      <VStack spacing={5}>
        <Heading
          fontSize="9xl"
          textAlign="center"
          mb={6}
          bgGradient="linear(to-l, #FF0000, #0000FF, #FFA500)"
          bgClip="text"
        >
          Image Search, Filter and Download
        </Heading>
        <HStack width="100%">
          <Input
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
            placeholder="Enter search terms separated by commas (e.g. Armenia, Armenian culture, Yerevan)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button onClick={handleSearch} isLoading={isLoading}>
            Search
          </Button>
        </HStack>

        {isLoading && <ProgressBar progress={progress} />}

        {totalImages > 0 && (
          <Text fontSize="lg" fontWeight="bold" mt={2}>
            Total images found: {totalImages}
          </Text>
        )}

        {Object.keys(searchResults).length > 0 && (
          <Button
            onClick={handleDownloadAll}
            isLoading={isDownloadingAll}
            colorScheme="blue"
            size="lg"
            leftIcon={<DownloadIcon />}
          >
            Download All
          </Button>
        )}

        {isDownloadingAll && (
          <CircularProgress
            value={downloadAllProgress}
            color="indigo.400"
            size="120px"
            thickness="4px"
          >
            <CircularProgressLabel>
              {downloadAllProgress}%
            </CircularProgressLabel>
          </CircularProgress>
        )}

        {Object.entries(searchResults).map(([term, urls]) => {
          const termTotalPages = Math.ceil(urls.length / IMAGES_PER_PAGE);
          return (
            <Box key={term} width="100%">
              <Heading
                fontSize="9xl"
                textAlign="center"
                mb={4}
                bgGradient="linear(to-r, red.500, blue.500, orange.500)"
                bgClip="text"
              >
                {term}
              </Heading>
              <Grid templateColumns="repeat(5, 1fr)" gap={4}>
                {urls
                  .slice(
                    (currentPages[term] - 1) * IMAGES_PER_PAGE,
                    currentPages[term] * IMAGES_PER_PAGE
                  )
                  .map((url) => (
                    <Box
                      key={url}
                      position="relative"
                      width="150px"
                      height="150px"
                    >
                      <Image
                        src={url}
                        alt={term}
                        objectFit="cover"
                        width="100%"
                        height="100%"
                      />
                      <IconButton
                        icon={<CloseIcon />}
                        size="sm"
                        colorScheme={
                          unselectedImages[term]?.includes(url)
                            ? "red"
                            : "green"
                        }
                        position="absolute"
                        top={1}
                        right={1}
                        onClick={() => handleImageToggle(term, url)}
                      />
                    </Box>
                  ))}
              </Grid>
              <Pagination
                currentPage={currentPages[term]}
                totalPages={termTotalPages}
                onPageChange={(page) =>
                  setCurrentPages((prev) => ({ ...prev, [term]: page }))
                }
              />
              <Button
                onClick={() => handleDownload(term)}
                isLoading={isDownloading[term]}
                mt={4}
              >
                Download {term} Images
              </Button>
              {isDownloading[term] && (
                <CircularProgress
                  value={downloadProgress[term]}
                  color="indigo.400"
                  size="120px"
                  thickness="4px"
                  mt={2}
                >
                  <CircularProgressLabel>
                    {downloadProgress[term]}%
                  </CircularProgressLabel>
                </CircularProgress>
              )}
            </Box>
          );
        })}
      </VStack>
    </Container>
  );
};

export default App;
