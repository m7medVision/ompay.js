/** @type {import('semantic-release').GlobalConfig} */
export default {
  branches: ["main"],
  repositoryUrl: "https://github.com/m7medVision/ompay.js.git",
  tagFormat: "${version}",
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [{ type: "chore", scope: "deps", release: "patch" }],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
      },
    ],
    "@semantic-release/npm",
    "@semantic-release/github",
  ],
};
