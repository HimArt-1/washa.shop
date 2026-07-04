import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "node_modules/**",
      "washa-dtf-studio/**",
      "Design System for Washa Studio/**",
      "output/**",
      "public/design/**",
      "tmp/**",
      "washa-motion/**",
      "test_*.js",
      "test_*.ts",
    ],
  },
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default config;
