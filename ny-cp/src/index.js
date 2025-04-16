#!/usr/bin/env node

import fs from 'node:fs/promises';

import { program } from 'commander';

async function isExists(filepath) {
    try {
        await fs.stat(filepath);
        return true;
    } catch (error) {
        return false;
    }
}

program
    .argument('<from>')
    .argument('<to>')
    .option('-r, --recursive', '')
    .version('1.0.0');

program.parse(process.argv);

const argument = program.args;
const options = program.opts();

const from = argument[0];
const to = argument[1];

const isRecursive = options.recursive ? true : false;

if (!(await isExists(from))) {
    console.log('Cannot copy file from doesnt exist file.');
    process.exit(0);
} else if (await isExists(to)) {
    console.log('You cant copy file to existing file.');
    process.exit(0);
}

const stats = await fs.stat(from);

if (stats.isDirectory() && !isRecursive) {
    console.log(
        `${process.argv[0]}: -r not specified; omitting directory '${from}'`
    );
    process.exit(0);
}

await fs.cp(from, to, { recursive: isRecursive });
