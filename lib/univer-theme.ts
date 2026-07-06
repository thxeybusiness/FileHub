import { defaultTheme } from "@univerjs/themes";

// Thème Univer aux couleurs de FileHub : accent bleu de marque, le reste
// hérité du thème par défaut.
const blue = {
  50: "#eef4ff",
  100: "#d9e6ff",
  200: "#bcd3ff",
  300: "#8eb6ff",
  400: "#598dff",
  500: "#3366ff",
  600: "#1f47f5",
  700: "#1836d8",
  800: "#1a2fae",
  900: "#1b2f89",
};

export const filehubTheme = {
  ...defaultTheme,
  primary: blue,
  hyacinth: blue,
} as typeof defaultTheme;
