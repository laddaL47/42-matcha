import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  AppShellHeader as MantineHeader,
  Menu,
  Portal,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconBell, IconHeart, IconMenu2, IconMessage, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const Header = () => {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const handleLogout = () => {
    // TODO: 実際のログアウト処理を実装
    console.log("ログアウト");
    setOpened(false);
  };

  return (
    <MantineHeader px="md">
      <Group justify="space-between" h="100%" w="100%">
        {/* ロゴとハンバーガーメニュー */}
        <Group>
          <Text
            component={Link}
            to="/"
            size="xl"
            fw={700}
            c="green"
            style={{ textDecoration: "none" }}
          >
            🍵 Matcha
          </Text>
        </Group>

        {/* ハンバーガーメニューボタン（モバイルのみ） */}
        {isMobile && (
          <Stack gap={1} align="center">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => setOpened(true)}
              aria-label="メニューを開く"
              styles={{
                root: {
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "scale(1.1)",
                    backgroundColor: "var(--mantine-color-gray-1)",
                  },
                },
              }}
            >
              <IconMenu2 size={20} />
            </ActionIcon>
            <Text size="xs" c="dimmed" ta="center">
              Menu
            </Text>
          </Stack>
        )}

        {/* ナビゲーション（デスクトップのみ） */}
        {!isMobile && (
          <Group>
            {/* 通知 */}
            <ActionIcon
              component={Link}
              to="/notifications"
              variant="subtle"
              size="lg"
              color="gray"
            >
              <Badge size="sm" color="red" variant="filled">
                3
              </Badge>
              <IconBell size={20} />
            </ActionIcon>

            {/* おすすめ */}
            <Button
              component={Link}
              to="/suggestions"
              variant="subtle"
              leftSection={<IconHeart size={16} />}
            >
              おすすめ
            </Button>

            {/* チャット */}
            <Button
              component={Link}
              to="/chat"
              variant="subtle"
              leftSection={<IconMessage size={16} />}
            >
              チャット
            </Button>

            {/* ユーザーメニュー */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Avatar
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32"
                  size="md"
                  style={{ cursor: "pointer" }}
                />
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>アカウント</Menu.Label>
                <Menu.Item component={Link} to="/profile/edit">
                  プロフィール編集
                </Menu.Item>
                <Menu.Item component={Link} to="/settings">
                  設定
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={handleLogout}>
                  ログアウト
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}
      </Group>

      {/* モバイル用ドロワーメニュー */}
      <Portal>
        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          title={
            <Group>
              <Text size="lg" fw={700} c="green">
                🍵 Matcha
              </Text>
            </Group>
          }
          size="sm"
          position="right"
          withOverlay
          closeButtonProps={{ icon: <IconX size={16} /> }}
          styles={{
            content: {
              background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
              zIndex: 1000,
            },
            header: {
              background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
              borderBottom: "1px solid #dee2e6",
              zIndex: 1001,
            },
            overlay: {
              zIndex: 999,
            },
          }}
          transitionProps={{
            transition: "slide-left",
            duration: 300,
            timingFunction: "ease-in-out",
          }}
        >
          <Stack gap="md">
            {/* ユーザー情報 */}
            <Group>
              <Avatar
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32"
                size="lg"
              />
              <div>
                <Text size="sm" fw={500}>
                  ユーザー名
                </Text>
                <Text size="xs" c="dimmed">
                  オンライン
                </Text>
              </div>
            </Group>

            <Divider />

            {/* ナビゲーションメニュー */}
            <Stack gap="xs">
              <Button
                component={Link}
                to="/notifications"
                variant="subtle"
                leftSection={<IconBell size={16} />}
                justify="flex-start"
                onClick={() => setOpened(false)}
              >
                通知
                <Badge size="sm" color="red" variant="filled" ml="auto">
                  3
                </Badge>
              </Button>

              <Button
                component={Link}
                to="/suggestions"
                variant="subtle"
                leftSection={<IconHeart size={16} />}
                justify="flex-start"
                onClick={() => setOpened(false)}
              >
                おすすめ
              </Button>

              <Button
                component={Link}
                to="/chat"
                variant="subtle"
                leftSection={<IconMessage size={16} />}
                justify="flex-start"
                onClick={() => setOpened(false)}
              >
                チャット
              </Button>
            </Stack>

            <Divider />

            {/* アカウントメニュー */}
            <Stack gap="xs">
              <Button
                component={Link}
                to="/profile/edit"
                variant="subtle"
                justify="flex-start"
                onClick={() => setOpened(false)}
              >
                プロフィール編集
              </Button>

              <Button
                component={Link}
                to="/settings"
                variant="subtle"
                justify="flex-start"
                onClick={() => setOpened(false)}
              >
                設定
              </Button>

              <Button variant="subtle" color="red" justify="flex-start" onClick={handleLogout}>
                ログアウト
              </Button>
            </Stack>
          </Stack>
        </Drawer>
      </Portal>
    </MantineHeader>
  );
};

export default Header;
