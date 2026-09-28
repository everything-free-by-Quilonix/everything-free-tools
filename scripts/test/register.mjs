// Loaded with `node --import`, before any test file. See hooks.mjs.
import { register } from "node:module";

register("./hooks.mjs", import.meta.url);
