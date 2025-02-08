#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs/promises';

import inquirer from 'inquirer';
import { program } from 'commander';
import { config } from 'dotenv';

import packageJson from "../package.json" with { type: "json" };

// get same needed stuff from env

config({ path: path.join(process.cwd(), '.env') });

const env = process.env;
const defualt_base_name = env.BASE_NAME;
const defualt_author = env.AUTHOR;
const defualt_git = env.GIT;

if (!defualt_base_name || !defualt_author || !defualt_git) {
    console.error(
        'Enviremont is not defined (BASE_NAME, AUTHOR and GIT variables).'
    );
    process.exit(1);
}

program.version(packageJson.version).description('Program to generate configs.');

program.parse(process.argv);

// needed functions

function joinPaths(base, path) {
    return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function getFileExtension(filename) {
    if (!filename.includes('.')) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : '';
}

async function ask(question, defualt) {
    try {
        const anwers = await inquirer.prompt({
            name: 'question1',
            type: 'input',
            message: question,
            default() {
                return defualt;
            },
        });

        return anwers.question1;
    } catch {
        console.log('^C');
        process.exit(1);
    }
}

async function ask_list(choices, question) {
    try {
        const anwers = await inquirer.prompt({
            name: 'question1',
            type: 'list',
            message: question,
            choices: choices,
        });

        return anwers.question1;
    } catch {
        console.log('^C');
        process.exit(1);
    }
}

// ask user

const base_name = await ask('Base name ?', defualt_base_name);
const name = await ask('Package name ?', 'project');
const version = await ask('Version ?', '1.0.0');

const author = await ask('Author ?', defualt_author);
const description = await ask('Description ?', '');

const main = await ask('Entry point ?', 'src/index.js');

const extension = getFileExtension(main);
const isTypescript = extension === 'ts';

const outDir = 'dist';
const rootDir = path.dirname(main);

const license = await ask('License ?', 'MIT');
const type = await ask_list(['module', 'commonjs'], 'Type ?');

const repository = joinPaths(defualt_git, `tree/main/${name}`);
const homepage = repository + '#readme';
const bugs = joinPaths(defualt_git, 'issues');

// generating configs

const package_json = `{
    "name": "${base_name}/${name}",
    "version": "${version}",

    "main": "${main}",
    "type": "${type}",

    "scripts": {},
    "keywords": [],

    "author": "${author}",
    "description": "${description}",

    "license": "${license}",

    "repository": {
        "type": "git",
        "url": "git+${repository}"
    },

    "bugs": {
        "url": "${bugs}"
    },

    "homepage": "git+${homepage}",

    "devDependencies": {
        "tsup": "^8.3.6"${isTypescript ? `,\n"typescript": "^5.7.3"` : ''}
    }
}`;

const tsconfig = `{
    "compilerOptions": {
        "rootDir": "${rootDir}",
        "outDir": "${outDir}",

        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "nodenext",
        "declaration": true,
        "declarationMap": false,
        "sourceMap": false,
        "removeComments": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "strict": true,
        "skipLibCheck": true

        "paths": {
            "@/*": ["./src/*"],
            "$/*": ["./*"]
        }
    },

    "include": ["${rootDir}"],
    "exclude": ["node_modules", "${outDir}"]
}`;

const tsup_config = `import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ["${main}"],
    format: ['esm'],
    outDir: "${outDir}",
    dts: false,
    splitting: false,
    minify: false,
    bundle: true,
    target: 'esnext',
});`;

const readme = `# ${name}
${description}`;

console.log(package_json);

const isOk = await ask('Is this OK?', 'yes');

if (isOk === 'yes') {
    await fs.writeFile('package.json', package_json);
} else {
    console.error('Operation stoped by user.');
    process.exit(1);
}

await fs.writeFile('README.md', readme); // always
await fs.writeFile('tsup.config.ts', tsup_config); // always
await fs.writeFile(main, `console.log("Hello world!")`); // always

if (extension === 'ts') {
    await fs.writeFile('tsconfig.json', tsconfig);
}
