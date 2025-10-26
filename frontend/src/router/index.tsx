import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/layout/Layout";
import App from "../pages/App";
import AuthPage from "../pages/auth/AuthPage";
import ChatList from "../pages/ChatList";
import ChatRoom from "../pages/ChatRoom";
import Dashboard from "../pages/Dashboard";
import Notifications from "../pages/Notifications";
import Onboarding from "../pages/onboarding/Onboarding";
import ProfileEdit from "../pages/ProfileEdit";
import Settings from "../pages/Settings";
import Suggestions from "../pages/suggestions/Suggestions";
import UserProfile from "../pages/UserProfile";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/onboarding",
    element: <Onboarding />,
  },
  {
    path: "/authn",
    element: <AuthPage />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/suggestions",
        element: <Suggestions />,
      },
      {
        path: "/profile/edit",
        element: <ProfileEdit />,
      },
      {
        path: "/u/:username",
        element: <UserProfile />,
      },
      {
        path: "/chat",
        element: <ChatList />,
      },
      {
        path: "/chat/:connectionId",
        element: <ChatRoom />,
      },
      {
        path: "/notifications",
        element: <Notifications />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
    ],
  },
]);

export default router;
