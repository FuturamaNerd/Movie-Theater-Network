const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    supportFile: false,
    baseUrl: "http://127.0.0.1:5500",
    specPattern: [
      "test/automation-qa/**/*.cy.js",
      "test/unit/**/*.cy.js",
    ],
  },
});
