import React from "react";
import { Box, Flex, Heading } from "@chakra-ui/react";

const NotFound = () => {
  return (
    <Flex flexDirection="column" minH="100vh" w="full">
      <Box
        zIndex="1"
        top="20%"
        left="15%"
        position="absolute"
        bg="orange.400"
        height="103px"
        width="103px"
      />
      <Box
        zIndex="1"
        top="15%"
        right="25%"
        position="absolute"
        opacity="0.5"
        bg="blue.400"
        height="60px"
        width="60px"
      />
      <Box
        zIndex="1"
        top="50%"
        right="10%"
        position="absolute"
        bg="blue.400"
        height="103px"
        width="103px"
      />
      <Box
        zIndex="1"
        top="60%"
        left="8%"
        opacity="0.1"
        position="absolute"
        bg="blue.400"
        height="204px"
        width="204px"
      />
      <Flex
        zIndex="10"
        position="relative"
        px="4"
        mx="auto"
        w="full"
        flex="1"
        maxW="7xl"
        flexDirection="column"
        justifyContent="flex-end"
      >
        <Heading
          textAlign="center"
          color="blue.400"
          fontSize={{ base: "2rem", sm: "4rem" }}
          mb="5"
          as="h2"
        >
          Not found{" "}
          <Box fontWeight="light" as="span">
            404
          </Box>
        </Heading>
      </Flex>
    </Flex>
  );
};

export default NotFound;
