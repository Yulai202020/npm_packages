#!/usr/bin/env node

import { promises } from 'fs';
import { program } from 'commander';
import packageJson from "../package.json" with { type: "json" };

program
    .argument('<dir>')
    .version(packageJson.version)
    .description('Program to create directories.');

program.parse(process.argv);

const argument = program.args;

const dir = argument[0];

if (!await promises.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
} else {
    const stats = await promises.stat(from);
    if (stats.isDirectory()) {
        console.log(`${process.argv[0]}: cannot create directory ${dir} Directory already exists.`);
    } else {
        console.log(`${process.argv[0]}: cannot create directory ${dir} File exists.`);
    }
}