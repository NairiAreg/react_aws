import { Table, Tbody, Td, Tr } from "@chakra-ui/react";

function createBoard(size) {
  if (size === 0) {
    return [["🟨"]];
  }
  const board = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "❌")
  );
  const center = Math.floor(size / 2);
  board[center][center] = "🟨";
  return board;
}

export default function TicTacToeBoard({ size }) {
  const board = createBoard(size);

  return (
    <Table borderWidth="0.5px" borderColor="black" w="auto">
      <Tbody>
        {board.map((row, rowIndex) => (
          <Tr key={rowIndex}>
            {row.map((cell, colIndex) => (
              <Td
                key={colIndex}
                borderWidth="0.5px"
                borderColor="black"
                p={0}
                w="25px"
                h="25px"
                textAlign="center"
                fontSize="10px"
              >
                {cell}
              </Td>
            ))}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
