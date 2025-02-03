#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import chalk from 'chalk';
import { program } from 'commander';

async function listDir(dir) {
    try {
        return await fs.readdir(dir);
    } catch (err) {
        console.error('Error occurred while reading directory:', err);
    }
}

function modeToString(mode) {
    const fileType = (mode & 0o170000) === 0o040000 ? 'd' : '-';
    const ownerPermissions = [
        mode & 0o400 ? 'r' : '-',
        mode & 0o200 ? 'w' : '-',
        mode & 0o100 ? 'x' : '-',
    ].join('');
    const groupPermissions = [
        mode & 0o040 ? 'r' : '-',
        mode & 0o020 ? 'w' : '-',
        mode & 0o010 ? 'x' : '-',
    ].join('');
    const othersPermissions = [
        mode & 0o004 ? 'r' : '-',
        mode & 0o002 ? 'w' : '-',
        mode & 0o001 ? 'x' : '-',
    ].join('');

    return `${fileType}${ownerPermissions}${groupPermissions}${othersPermissions}`;
}

function sizeToString(size) {
    let postfixs = ['B', 'Kb', 'Mb', 'Gb', 'Pb'];
    let now_postfix = 'B';

    for (let id = 0; id < postfixs.length; id++) {
        if (size < 1024 || id === postfixs.length - 1) {
            return `${size.toFixed(1)}${now_postfix}`;
        }

        size /= 1024;
        now_postfix = postfixs[id + 1];
    }
}

program
    .argument('<dirs...>')
    .option('-a, --all', 'do not ignore entries starting with .')
    .option('-l', 'use a long listing format')
    .version('1.0.0');

program.parse(process.argv);

const argument = program.args;
const options = program.opts();

for (let [id, dirPath] of argument.entries()) {
    console.log(dirPath, ':');

    const files = await listDir(dirPath);

    for (let file of files) {
        const filename = path.join(dirPath, file);

        const stat = await fs.stat(filename);

        const owner = os.userInfo(stat.uid).username;
        const group = os.userInfo(stat.gid).username;
        const mode = modeToString(stat.mode);
        const size = sizeToString(stat.size);

        if ((options.a || !file.startsWith('.')) && options.l) {
            process.stdout.write(`${mode} ${owner} ${group} ${size} `);
        }

        console.log(stat.isDirectory() ? chalk.green(file) : file);
    }

    if (id !== argument.length - 1) {
        console.log();
    }
}
