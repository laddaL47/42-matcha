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
import { IconHeart, IconMapPin, IconMessage, IconUsers } from "@tabler/icons-react";
import { Link } from "react-router-dom";

function App() {
  return (
    <Center>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* ヘッダー */}
          <div style={{ textAlign: "center" }}>
            <Title order={1} size="4rem" mb="md" c="pink">
              💕 Matcha
            </Title>
            <Text size="xl" c="dimmed" maw={600} mx="auto">
              素敵な出会いを見つけましょう。あなたにぴったりの人とマッチできます。
            </Text>
          </div>

          {/* 機能紹介 */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="xl" radius="md" withBorder h="100%">
                <Stack gap="md">
                  <Group>
                    <IconHeart size={32} color="var(--mantine-color-pink-6)" />
                    <Title order={3}>スマートマッチング</Title>
                  </Group>
                  <Text c="dimmed">
                    共通の興味や価値観を持つ人とマッチできます。
                    アルゴリズムがあなたに最適な人を見つけます。
                  </Text>
                  <Badge color="pink" variant="light">
                    新機能
                  </Badge>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="xl" radius="md" withBorder h="100%">
                <Stack gap="md">
                  <Group>
                    <IconMapPin size={32} color="var(--mantine-color-blue-6)" />
                    <Title order={3}>位置ベース検索</Title>
                  </Group>
                  <Text c="dimmed">
                    近くの人を見つけて、実際に会うことができます。
                    距離に基づいた検索で、リアルな出会いを提供します。
                  </Text>
                  <Badge color="blue" variant="light">
                    人気
                  </Badge>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="xl" radius="md" withBorder h="100%">
                <Stack gap="md">
                  <Group>
                    <IconMessage size={32} color="var(--mantine-color-green-6)" />
                    <Title order={3}>安全なチャット</Title>
                  </Group>
                  <Text c="dimmed">
                    相互いいねが成立したら、安全なチャット機能で
                    コミュニケーションを取ることができます。
                  </Text>
                  <Badge color="green" variant="light">
                    安全
                  </Badge>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="sm" padding="xl" radius="md" withBorder h="100%">
                <Stack gap="md">
                  <Group>
                    <IconUsers size={32} color="var(--mantine-color-orange-6)" />
                    <Title order={3}>コミュニティ</Title>
                  </Group>
                  <Text c="dimmed">
                    同じ興味を持つ人たちとつながり、 新しい友達やパートナーを見つけましょう。
                  </Text>
                  <Badge color="orange" variant="light">
                    コミュニティ
                  </Badge>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* 統計 */}
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <Title order={2}>Join thousands of happy users</Title>
              <Group gap="xl">
                <div style={{ textAlign: "center" }}>
                  <Text size="2rem" fw={700} c="pink">
                    10,000+
                  </Text>
                  <Text size="sm" c="dimmed">
                    アクティブユーザー
                  </Text>
                </div>
                <div style={{ textAlign: "center" }}>
                  <Text size="2rem" fw={700} c="blue">
                    500+
                  </Text>
                  <Text size="sm" c="dimmed">
                    成功したマッチ
                  </Text>
                </div>
                <div style={{ textAlign: "center" }}>
                  <Text size="2rem" fw={700} c="green">
                    95%
                  </Text>
                  <Text size="sm" c="dimmed">
                    満足度
                  </Text>
                </div>
              </Group>
            </Stack>
          </Card>

          {/* アクションボタン */}
          <Stack align="center" gap="md">
            <Group>
              <Button
                component={Link}
                to="/onboarding"
                size="lg"
                color="pink"
                leftSection={<IconHeart size={20} />}
              >
                今すぐ始める
              </Button>
              <Button
                component={Link}
                to="/authn"
                variant="outline"
                size="lg"
                leftSection={<IconUsers size={20} />}
              >
                ログイン
              </Button>
            </Group>
            <Text size="sm" c="dimmed">
              無料で始められます • いつでもキャンセル可能
            </Text>
          </Stack>

          {/* テストモニアル */}
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <Title order={3}>ユーザーの声</Title>
              <Grid>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack align="center" gap="sm">
                    <Avatar size="lg" color="pink" />
                    <Text fw={500}>Alice</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      "素敵な人と出会えて、今では付き合っています！"
                    </Text>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack align="center" gap="sm">
                    <Avatar size="lg" color="blue" />
                    <Text fw={500}>Bob</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      "共通の趣味を持つ人と出会えて、とても楽しいです。"
                    </Text>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Stack align="center" gap="sm">
                    <Avatar size="lg" color="green" />
                    <Text fw={500}>Charlie</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      "安全で使いやすいアプリです。おすすめです！"
                    </Text>
                  </Stack>
                </Grid.Col>
              </Grid>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Center>
  );
}

export default App;
