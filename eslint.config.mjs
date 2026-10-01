import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // react-hooks@7 introduced this rule but it fires on many valid patterns
      // (calling a fetch function, resetting state on dependency change, etc.)
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
