#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { program } from 'commander';

async function cpFile(from, to) {
    try {
        return await fs.copyFile(from, to);
    } catch (err) {
        console.error('Error occurred while reading directory:', err);
    }
}

program.argument('<from>').argument('<to>').version('1.0.0');

program.parse(process.argv);

const argument = program.args;

const from = argument[0];
const to = argument[1];

if (fs.existsSync(from)) {
    if (fs.existsSync(to)) {
        throw new Error('You cant copy file to existing file.');
    }

    await cpFile(from, to);
} else {
    throw new Error('Cannot copy file from doesnt exist file.');
}
