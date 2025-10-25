import { Container, Text, Title } from "@mantine/core";

const ChatMain = () => {
  return (
    <Container>
      <Title order={2}>Chats</Title>
      <Text c="dimmed">Pick a conversation to start chatting.</Text>
    </Container>
  );
};

export default ChatMain;
