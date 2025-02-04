#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { program } from 'commander';

program.argument('<from>').argument('<to>').version('1.0.0');

program.parse(process.argv);

const argument = program.args;

const from = argument[0];
const to = argument[1];

const error = await fs.copyFile(from, to);
