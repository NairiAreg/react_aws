import React from "react";
import {
  Box,
  Flex,
  IconButton,
  Input,
  Text,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";

const ImageUpload = ({ id, label, onChange, fileCount, multiple }) => {
  return (
    <FormControl id={id}>
      <FormLabel>{label}</FormLabel>
      <Box border="1px dashed" borderColor="gray.300" p={3} borderRadius="md">
        <Flex align="center">
          <IconButton
            icon={<FaFileUpload />}
            aria-label={`Upload ${label}`}
            as="label"
            htmlFor={`input-${id}`}
            colorScheme="teal"
            variant="outline"
          />
          <Input
            id={`input-${id}`}
            type="file"
            onChange={onChange}
            hidden
            multiple={multiple}
          />
          <Text ml={3}>
            {fileCount > 0
              ? `${fileCount} files selected`
              : `Click to upload ${label.toLowerCase()}`}
          </Text>
        </Flex>
      </Box>
    </FormControl>
  );
};

export default ImageUpload;
