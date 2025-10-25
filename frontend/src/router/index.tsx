import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "../pages/App";
import AuthPage from "../pages/auth/AuthPage";
import Dashboard from "../pages/Dashboard";
import Suggestions from "../pages/suggestions/Suggestions";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "/authn",
    element: <AuthPage />,
  },
  {
    path: "/suggestions",
    element: <Suggestions />,
  },
  // TODO: 他のページを追加
  // {
  //   path: "/profile/edit",
  //   element: <ProfileEdit />,
  // },
  // {
  //   path: "/u/:username",
  //   element: <UserProfile />,
  // },
  // {
  //   path: "/chat",
  //   element: <ChatMain />,
  // },
  // {
  //   path: "/chat/:connectionId",
  //   element: <ChatRoom />,
  // },
  // {
  //   path: "/notifications",
  //   element: <Notifications />,
  // },
  // {
  //   path: "/settings",
  //   element: <Settings />,
  // },
]);

export default router;
