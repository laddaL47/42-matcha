import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  AppShellHeader as MantineHeader,
  Menu,
  Text,
} from "@mantine/core";
import { IconBell, IconHeart, IconMessage } from "@tabler/icons-react";
import { Link } from "react-router-dom";

const Header = () => {
  const handleLogout = () => {
    // TODO: 実際のログアウト処理を実装
    console.log("ログアウト");
  };

  return (
    <MantineHeader px="md">
      <Group justify="space-between" h="100%" w="100%">
        {/* ロゴ */}
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

        {/* ナビゲーション */}
        <Group>
          {/* 通知 */}
          <ActionIcon component={Link} to="/notifications" variant="subtle" size="lg" color="gray">
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
      </Group>
    </MantineHeader>
  );
};

export default Header;
