import { Button, Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import viteLogo from "/vite.svg";
import reactLogo from "./assets/react.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <Container size="md" py="xl">
      <Stack align="center" gap="lg">
        <Group>
          <a href="https://vite.dev" target="_blank" rel="noopener">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noopener">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </Group>

        <Title order={1}>Vite + React + Mantine</Title>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack align="center" gap="md">
            <Button variant="filled" size="lg" onClick={() => setCount((count) => count + 1)}>
              Count is {count}
            </Button>
            <Text size="sm" c="dimmed">
              Edit <code>src/App.tsx</code> and save to test HMR
            </Text>
          </Stack>
        </Card>

        <Text size="sm" c="dimmed">
          Click on the Vite and React logos to learn more
        </Text>
      </Stack>
    </Container>
  );
}

export default App;
