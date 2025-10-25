import { Container, Text, Title } from "@mantine/core";
import { useParams } from "react-router-dom";

const ChatRoom = () => {
  const { connectionId } = useParams();

  return (
    <Container>
      <Title order={2}>Chat Room</Title>
      <Text c="dimmed">Conversation ID: {connectionId ?? "Unknown connection"}</Text>
    </Container>
  );
};

export default ChatRoom;
