import { ActionIcon, Badge, Group, Text, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconBell, IconHeart, IconMessage, IconUser } from "@tabler/icons-react";
import { Link, useLocation } from "react-router-dom";

interface NavItem {
  path: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
}

const BottomNavigation = () => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      path: "/suggestions",
      icon: IconHeart,
      label: "おすすめ",
    },
    {
      path: "/chat",
      icon: IconMessage,
      label: "チャット",
    },
    {
      path: "/notifications",
      icon: IconBell,
      label: "通知",
      badge: 3,
    },
    {
      path: "/profile",
      icon: IconUser,
      label: "プロフィール",
    },
  ];

  if (!isMobile) {
    return null;
  }

  return (
    <Group
      justify="space-around"
      p="md"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "var(--mantine-color-white)",
        borderTop: "1px solid var(--mantine-color-gray-2)",
        zIndex: 1000,
        boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "8px",
              borderRadius: "8px",
              transition: "all 0.2s ease",
              backgroundColor: isActive ? "var(--mantine-color-green-0)" : "transparent",
              transform: isActive ? "scale(1.05)" : "scale(1)",
            }}
          >
            <div style={{ position: "relative" }}>
              <ActionIcon
                variant="subtle"
                size="lg"
                color={isActive ? "green" : "gray"}
                style={{
                  transition: "all 0.2s ease",
                }}
              >
                <Icon size={20} />
              </ActionIcon>
              {item.badge && item.badge > 0 && (
                <Badge
                  size="xs"
                  color="red"
                  variant="filled"
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    minWidth: "16px",
                    height: "16px",
                    fontSize: "10px",
                    padding: "0 4px",
                  }}
                >
                  {item.badge}
                </Badge>
              )}
            </div>
            <Text
              size="xs"
              c={isActive ? "green" : "dimmed"}
              fw={isActive ? 600 : 400}
              style={{
                transition: "all 0.2s ease",
              }}
            >
              {item.label}
            </Text>
          </Link>
        );
      })}
    </Group>
  );
};

export default BottomNavigation;
