#!/usr/bin/env node

// src/index.js
import fs from "node:fs/promises";
import { program } from "commander";
async function cpFile(from2, to2) {
  try {
    return await fs.copyFile(from2, to2);
  } catch (err) {
    console.error("Error occurred while reading directory:", err);
  }
}
program.argument("<from>").argument("<to>").version("1.0.0");
program.parse(process.argv);
var argument = program.args;
var from = argument[0];
var to = argument[1];
if (fs.existsSync(from)) {
  await cpFile(from, to);
}
