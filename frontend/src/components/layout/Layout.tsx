import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import Header from "./Header";

const Layout = () => {
  return (
    <AppShell header={{ height: 70 }}>
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
