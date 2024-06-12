import React from "react";
import { ChakraProvider as Chakra, ColorModeScript } from "@chakra-ui/react";

const ChakraProvider = ({ children }) => (
  <Chakra resetCSS>
    <ColorModeScript />
    {children}
  </Chakra>
);

export default ChakraProvider;
