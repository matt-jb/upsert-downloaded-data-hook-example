// This script fetches data from a GraphQL endpoint and creates two files:
// - conditions.ts
// - requirements.ts
//
// It uses the following environment variables:
// - GRAPHQL_URL: The URL of the GraphQL endpoint.
// - GRAPHQL_QUERY: The GraphQL query to be executed.
//
// You can run this script as pre-commit hook
// or a pre-run step in a CI/CD pipeline.
// e.g. in package.json:
// "prebuild": "ts-node download.ts",
// "build": ...

import "dotenv/config";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { promises as fs } from "fs";

const { GRAPHQL_URL } = process.env;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONDITIONS_PATH = join(__dirname, "../src/helpers/conditions.ts");
const REQUIREMENTS_PATH = join(__dirname, "../src/helpers/requirements.ts");

const QUERY = `
  // gql query
`;

/**
 * Fetches data from a GraphQL endpoint using the provided URL and query.
 *
 * @param {string} url - The URL of the GraphQL endpoint.
 * @param {string} query - The GraphQL query to be executed.
 * @return {Promise<object>} - A promise that resolves to the fetched data.
 * @throws {Error} - If the response status is not 200 or if the response is not ok.
 */
export const fetchGQL = async (url, query) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
    }),
  });

  if (response.status !== 200 || !response.ok) {
    throw new Error("Error fetching data");
  }

  const { data } = await response.json();
  return data;
};

/**
 * Creates or opens a text file at the given path and replaces its contents.
 * @param {string} filePath - The path of the file to create or open.
 * @param {string} content - The content to write into the file.
 */
export const createOrReplaceFile = async (filePath, content) => {
  try {
    await fs.writeFile(filePath, content, "utf-8");
  } catch (error) {
    throw new Error(`Error writing to the file: ${filePath}`);
  }
};

export const createSettingsTemplate = (strings, value) => {
  let code = `/* eslint-disable */\n/* This code was automatically generated. Please do not edit. */\n`;

  code += strings.reduce((acc, str, i) => {
    if (i === 0) {
      const stringified = value.reduce((acc, { name, type }, _) => {
        return (
          acc +
          `\x20\x20{ type: "${type}", label: "${name}", value: "${name}" },\n`
        );
      }, "");
      return `${acc}${str}[\n${stringified}]`;
    }
    return acc + str;
  }, "");

  return code + "\n";
};

(async () => {
  const { taxonomy } = await fetchGQL(GRAPHQL_URL, QUERY);

  const firstConditionsIndex = taxonomy.findIndex(
    ({ type }) => type === "condition"
  );
  const conditions = taxonomy.slice(0, firstConditionsIndex);
  const requirements = taxonomy.slice(firstConditionsIndex);

  await createOrReplaceFile(
    CONDITIONS_PATH,
    createSettingsTemplate`export const CONDITIONS = ${conditions} as const;`
  );
  console.log("🥳 Created conditions file");

  await createOrReplaceFile(
    REQUIREMENTS_PATH,
    createSettingsTemplate`export const REQUIREMENTS = ${requirements} as const;`
  );
  console.log("🥳 Created requirements file");
})();
