import {
  ActionIcon,
  Avatar,
  Badge,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconHeart, IconMapPin, IconX } from "@tabler/icons-react";

// モックデータ
const mockUsers = [
  {
    id: 1,
    username: "alice_tokyo",
    firstName: "Alice",
    lastName: "Tanaka",
    age: 25,
    distance: 2.3,
    bio: "アートとカフェが好きです。週末は美術館巡りをしています。",
    tags: ["アート", "カフェ", "美術館"],
    photos: ["https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300"],
    isOnline: true,
    lastSeen: "2分前",
  },
  {
    id: 2,
    username: "bob_osaka",
    firstName: "Bob",
    lastName: "Sato",
    age: 28,
    distance: 5.7,
    bio: "プログラミングとゲームが趣味です。新しい技術を学ぶのが好き。",
    tags: ["プログラミング", "ゲーム", "技術"],
    photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"],
    isOnline: false,
    lastSeen: "1時間前",
  },
  {
    id: 3,
    username: "charlie_kyoto",
    firstName: "Charlie",
    lastName: "Yamada",
    age: 23,
    distance: 8.1,
    bio: "写真撮影と旅行が大好きです。日本各地を旅しています。",
    tags: ["写真", "旅行", "カメラ"],
    photos: ["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300"],
    isOnline: true,
    lastSeen: "オンライン",
  },
  {
    id: 4,
    username: "diana_nagoya",
    firstName: "Diana",
    lastName: "Nakamura",
    age: 26,
    distance: 12.4,
    bio: "ヨガと瞑想を日課にしています。健康的な生活を心がけています。",
    tags: ["ヨガ", "瞑想", "健康"],
    photos: ["https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300"],
    isOnline: false,
    lastSeen: "3時間前",
  },
  {
    id: 5,
    username: "eve_yokohama",
    firstName: "Eve",
    lastName: "Suzuki",
    age: 24,
    distance: 15.2,
    bio: "料理と読書が趣味です。新しいレシピに挑戦するのが楽しい。",
    tags: ["料理", "読書", "レシピ"],
    photos: ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300"],
    isOnline: true,
    lastSeen: "オンライン",
  },
];

const Suggestions = () => {
  const handleLike = (userId: number) => {
    console.log(`Like user ${userId}`);
    // TODO: 実際のLike機能を実装
  };

  const handlePass = (userId: number) => {
    console.log(`Pass user ${userId}`);
    // TODO: 実際のPass機能を実装
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="sm">
            おすすめユーザー
          </Title>
          <Text c="dimmed" size="lg">
            あなたにマッチしそうなユーザーを表示しています
          </Text>
        </div>

        <Grid>
          {mockUsers.map((user) => (
            <Grid.Col key={user.id} span={{ base: 12, sm: 6, md: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                <Stack gap="md" h="100%">
                  {/* ユーザー情報 */}
                  <Group justify="space-between" align="flex-start">
                    <Group gap="sm">
                      <Avatar src={user.photos[0]} size="lg" radius="xl" />
                      <div>
                        <Text fw={600} size="lg">
                          {user.firstName} {user.lastName}
                        </Text>
                        <Text size="sm" c="dimmed">
                          @{user.username}
                        </Text>
                        <Group gap="xs" mt={4}>
                          <Text size="sm" c="dimmed">
                            {user.age}歳
                          </Text>
                          <IconMapPin size={14} />
                          <Text size="sm" c="dimmed">
                            {user.distance}km
                          </Text>
                        </Group>
                      </div>
                    </Group>

                    {/* オンライン状態 */}
                    <Badge color={user.isOnline ? "green" : "gray"} variant="light" size="sm">
                      {user.isOnline ? "オンライン" : user.lastSeen}
                    </Badge>
                  </Group>

                  {/* 自己紹介 */}
                  <Text size="sm" lineClamp={3}>
                    {user.bio}
                  </Text>

                  {/* タグ */}
                  <Group gap="xs">
                    {user.tags.map((tag) => (
                      <Badge key={tag} variant="light" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>

                  {/* アクションボタン */}
                  <Group justify="center" mt="auto">
                    <Tooltip label="パス">
                      <ActionIcon
                        variant="outline"
                        color="red"
                        size="lg"
                        onClick={() => handlePass(user.id)}
                      >
                        <IconX size={20} />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label="いいね">
                      <ActionIcon
                        variant="filled"
                        color="pink"
                        size="lg"
                        onClick={() => handleLike(user.id)}
                      >
                        <IconHeart size={20} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {/* ローディング・エラー状態のプレースホルダー */}
        <Group justify="center" mt="xl">
          <Text size="sm" c="dimmed">
            もっと多くのユーザーを表示するには、フィルターや検索機能を使用してください
          </Text>
        </Group>
      </Stack>
    </Container>
  );
};

export default Suggestions;
