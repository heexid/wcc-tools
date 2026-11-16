// Stands in for fixtures.ts in staging / production builds (next.config.ts turbopack.resolveAlias), so the
// 58 Figma-screen fixtures never reach the client bundle. Only the plain seed exists there.
import type { Db } from "./types";

export const FIXTURES = {};
export const applyFixture = (db: Db): Db => db;
