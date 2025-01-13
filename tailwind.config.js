/** @type {import('tailwindcss').Config} */
export default {
   darkMode: "class",
   content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
   theme: {
      extend: {
         colors: {
            // Light mode colors
            light: {
               primary: "#ffffff",
               secondary: "#f3f4f6",
               accent: "#3b82f6",
               text: "#1f2937",
            },
            // Dark mode colors
            dark: {
               primary: "#1f2937",
               secondary: "#111827",
               accent: "#60a5fa",
               text: "#f3f4f6",
            },
         },
      },
   },
   plugins: [],
};
