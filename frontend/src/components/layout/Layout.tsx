import { AppShell, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Outlet } from "react-router-dom";
import BottomNavigation from "./BottomNavigation";
import Header from "./Header";

const Layout = () => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  return (
    <AppShell header={{ height: 70 }} padding={0}>
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Main
        style={{
          paddingBottom: isMobile ? "80px" : "0",
        }}
      >
        <Outlet />
      </AppShell.Main>
      {isMobile && <BottomNavigation />}
    </AppShell>
  );
};

export default Layout;
