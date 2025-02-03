#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { program } from 'commander';

program.argument('<dirs...>');

program.parse(process.argv);

const argument = program.args;

for (let dirPath of argument) {
    fs.readdir(dirPath, (err, files) => {
        if (err) {
            console.error(
                chalk.red(`Error reading directory: ${dirPath}`),
                err.message
            );
            return;
        }

        for (let file of files) {
            const filename = path.join(dirPath, file);

            fs.stat(filename, (err, stat) => {
                if (err) {
                    console.error(
                        chalk.red(`Error reading file: ${filePath}`),
                        err.message
                    );
                    return;
                }

                if (stat.isDirectory()) {
                    console.log(chalk.green(file));
                } else {
                    console.log(file);
                }
            });
        }
    });
}
