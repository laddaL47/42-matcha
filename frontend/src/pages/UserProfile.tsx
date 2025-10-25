import { Container, Text, Title } from "@mantine/core";
import { useParams } from "react-router-dom";

const UserProfile = () => {
  const { username = "User" } = useParams();

  return (
    <Container>
      <Title order={2}>{username}</Title>
      <Text c="dimmed">Public profile details will appear here.</Text>
    </Container>
  );
};

export default UserProfile;
