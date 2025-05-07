module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: [
    "@typescript-eslint",
  ],
  rules: {
    // Desativar regras chatas de estilo
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "no-trailing-spaces": "off",
    "comma-dangle": "off",
    "quotes": "off",
    "indent": "off",
    "max-len": "off",
    "semi": "off",
    "object-curly-spacing": "off",
    "space-before-function-paren": "off",
    "arrow-parens": "off",
    "eol-last": "off",
    "padded-blocks": "off",
    "block-spacing": "off",
    "brace-style": "off",
    "no-multi-spaces": "off",
    "linebreak-style": "off",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "import/no-unresolved": "off",
    "prefer-const": "off",
    "no-irregular-whitespace": "off",
    "no-var-requires": "off",
    "no-unused-vars": "off",
    "no-undef": "off",
    "no-inferrable-types": "off",
  },
};