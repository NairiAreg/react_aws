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
    <Table borderWidth="1px" borderColor="black" w="auto">
      <Tbody>
        {board.map((row, rowIndex) => (
          <Tr key={rowIndex}>
            {row.map((cell, colIndex) => (
              <Td
                key={colIndex}
                borderWidth="1px"
                borderColor="black"
                p={0}
                w="50px"
                h="50px"
                textAlign="center"
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
