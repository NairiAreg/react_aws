import React from "react";
import Routes, { RouterProvider } from "./pages";
import { ChakraProvider } from "./providers";

function App() {
  return (
    <ChakraProvider>
      <RouterProvider>
        <Routes />
      </RouterProvider>
    </ChakraProvider>
  );
}

export default App;
