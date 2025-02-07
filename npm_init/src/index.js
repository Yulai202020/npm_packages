#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'node:fs/promises';
import { program } from 'commander';

const env = process.env;
const defualt_base_name = env.BASE_NAME;
const defualt_author = env.AUTHOR;
const defualt_git = env.GIT;

program.version('1.0.0');

program.parse(process.argv);

function joinPaths(base, path) {
    return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function getFileExtension(filename) {
    if (!filename.includes('.')) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : '';
}

async function ask(question, defualt) {
    const anwers = await inquirer.prompt({
        name: 'question1',
        type: 'input',
        message: question,
        default() {
            return defualt;
        },
    });

    return anwers.question1;
}

async function ask_list(choices, question) {
    const anwers = await inquirer.prompt({
        name: 'question1',
        type: 'list',
        message: question,
        choices: choices,
    });

    return anwers.question1;
}

const base_name = await ask('Base name ?', defualt_base_name);
const name = await ask('Package name ?', 'project');
const version = await ask('Version ?', '1.0.0');

const author = await ask('Author ?', defualt_author);
const description = await ask('Description ?', '');

const rootDir = await ask('Root dir ?', 'src');
const outDir = await ask('Output dir ?', 'dist');
const main = await ask('Entry point ?', 'src/index.js');
const extension = getFileExtension(main);
const isTypescript = extension === 'ts';

const license = await ask_list(['MIT', 'ISC'], 'License ?');
const type = await ask_list(['module', 'commonjs'], 'Type ?');

const repository = joinPaths(defualt_git, `tree/main/${name}`);
const homepage = repository + '#readme';
const bugs = joinPaths(defualt_git, 'issues');

// configs

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

console.log(package_json);

const isOk = await ask('Is this OK?', 'yes');

if (isOk === 'yes') {
    await fs.writeFile('package1.json', package_json);
} else {
    console.error('Operation stoped by user.');
}

await fs.writeFile('README.md', `# ${name}\n${description}`); // always
await fs.writeFile('tsup.config.ts', tsup_config); // always

if (extension === 'ts') {
    await fs.writeFile('tsconfig.json', tsconfig);
}
