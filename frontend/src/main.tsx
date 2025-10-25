import { createTheme, MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@mantine/core/styles.css";
import "./index.css";
import router from "./router";

const theme = createTheme({
  primaryColor: "green",
  colors: {
    green: [
      "#f0f9f0",
      "#e1f5e1",
      "#c3e6c3",
      "#a4d4a4",
      "#85c285",
      "#66b066",
      "#4d9d4d",
      "#3d7a3d",
      "#2d572d",
      "#1d341d",
    ],
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>
);
