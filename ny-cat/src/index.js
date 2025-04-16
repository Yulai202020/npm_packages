#!/usr/bin/env node

import { promises } from 'fs';
import { program } from 'commander';
import packageJson from "../package.json" with { type: "json" };

program
    .argument('<file>')
    .version(packageJson.version)
    .description('Program to see inside files.');

program.parse(process.argv);

const argument = program.args;

const file = argument[0];

try {
    const stats = await promises.stat(from);
    if (stats.isDirectory()) {
        console.log(`${process.argv[0]}: ${file}: Is a directory`);
        process.exit(1);
    }

    const content = await promises.readFile(file, 'utf8');
    console.log(content);
} catch (e) {
    console.log(`${process.argv[0]}: ${file}: No such file or directory.`);
}