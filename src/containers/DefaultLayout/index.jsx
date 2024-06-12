import React from 'react'
import { Box } from '@chakra-ui/react'

const DefaultLayout = ({ children }) => {
  return (
    <Box minH="100vh" width="100%">
      {children}
    </Box>
  )
}

export default DefaultLayout
