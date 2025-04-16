#!/usr/bin/env node

import { promises } from 'fs';
import { program } from 'commander';
import packageJson from "../package.json" with { type: "json" };

async function moveFile(from_path, to_path) {
    try {
        await promises.rename(from_path, to_path);
    } catch (err) {}
}

program
    .argument('<from>')
    .argument('<to>')
    .version(packageJson.version)
    .description('Program to move files.');

program.parse(process.argv);

const argument = program.args;

const from = argument[0];
const to = argument[1];

try {
    await promises.stat(from);
    await moveFile(from, to);
} catch (e) {
    console.log(`${process.argv[0]}: ${from}: No such file or directory.`);
}