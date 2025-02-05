#!/usr/bin/env node

import fs from 'node:fs/promises';

import { program } from 'commander';

async function isExists(filepath) {
    try {
        const stats = await fs.stat(filepath);
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
    throw new Error('Cannot copy file from doesnt exist file.');
} else if (await isExists(to)) {
    throw new Error('You cant copy file to existing file.');
}

const stats = await fs.stat(from);

if (stats.isDirectory() && !isRecursive) {
    throw new Error(`cp: -r not specified; omitting directory '${from}'`);
}

await fs.cp(from, to, { recursive: isRecursive });
