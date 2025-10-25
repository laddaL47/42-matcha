import {
  Avatar,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconBell, IconHeart, IconMessage, IconUsers } from "@tabler/icons-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  // モックデータ
  const stats = {
    newMatches: 3,
    unreadMessages: 5,
    likesReceived: 12,
    notifications: 8,
  };

  const recentActivity = [
    {
      id: 1,
      type: "like",
      user: "Alice Tanaka",
      message: "あなたにいいねを送りました",
      time: "2分前",
    },
    {
      id: 2,
      type: "message",
      user: "Bob Sato",
      message: "新しいメッセージが届きました",
      time: "15分前",
    },
    {
      id: 3,
      type: "match",
      user: "Charlie Yamada",
      message: "マッチしました！",
      time: "1時間前",
    },
  ];

  return (
    <Center>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* ヘッダー */}
          <div>
            <Title order={1} mb="sm">
              ダッシュボード
            </Title>
            <Text c="dimmed" size="lg">
              あなたのマッチング活動を確認しましょう
            </Text>
          </div>

          {/* 統計カード */}
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      新しいマッチ
                    </Text>
                    <Text size="xl" fw={700} c="pink">
                      {stats.newMatches}
                    </Text>
                  </div>
                  <IconHeart size={32} color="var(--mantine-color-pink-6)" />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      未読メッセージ
                    </Text>
                    <Text size="xl" fw={700} c="blue">
                      {stats.unreadMessages}
                    </Text>
                  </div>
                  <IconMessage size={32} color="var(--mantine-color-blue-6)" />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      受けたいいね
                    </Text>
                    <Text size="xl" fw={700} c="green">
                      {stats.likesReceived}
                    </Text>
                  </div>
                  <IconUsers size={32} color="var(--mantine-color-green-6)" />
                </Group>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      通知
                    </Text>
                    <Text size="xl" fw={700} c="orange">
                      {stats.notifications}
                    </Text>
                  </div>
                  <IconBell size={32} color="var(--mantine-color-orange-6)" />
                </Group>
              </Card>
            </Grid.Col>
          </Grid>

          {/* クイックアクション */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              クイックアクション
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Button
                  component={Link}
                  to="/suggestions"
                  variant="filled"
                  color="pink"
                  size="lg"
                  fullWidth
                  leftSection={<IconUsers size={20} />}
                >
                  おすすめユーザー
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Button
                  component={Link}
                  to="/chat"
                  variant="outline"
                  color="blue"
                  size="lg"
                  fullWidth
                  leftSection={<IconMessage size={20} />}
                >
                  チャット
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Button
                  component={Link}
                  to="/notifications"
                  variant="outline"
                  color="orange"
                  size="lg"
                  fullWidth
                  leftSection={<IconBell size={20} />}
                >
                  通知
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Button
                  component={Link}
                  to="/profile/edit"
                  variant="outline"
                  color="gray"
                  size="lg"
                  fullWidth
                >
                  プロフィール編集
                </Button>
              </Grid.Col>
            </Grid>
          </Card>

          {/* 最近のアクティビティ */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              最近のアクティビティ
            </Title>
            <Stack gap="sm">
              {recentActivity.map((activity) => (
                <Group
                  key={activity.id}
                  justify="space-between"
                  p="sm"
                  style={{ border: "1px solid var(--mantine-color-gray-2)", borderRadius: "8px" }}
                >
                  <Group gap="sm">
                    <Avatar size="sm" color="blue" />
                    <div>
                      <Text size="sm" fw={500}>
                        {activity.user}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {activity.message}
                      </Text>
                    </div>
                  </Group>
                  <Badge variant="light" size="sm">
                    {activity.time}
                  </Badge>
                </Group>
              ))}
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Center>
  );
};

export default Dashboard;
