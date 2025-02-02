#!/usr/bin/env node

import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import inquirer from 'inquirer';
import gradient from 'gradient-string';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';

async function sleep(ms = 2000) {
    return new Promise((r) => setTimeout(r, ms));
}

async function printAnimated(string, delay = 2000) {
    const animation = chalkAnimation.rainbow(string);
    await sleep(delay);
    animation.stop();
}

async function printFiglet(string) {
    figlet(string, (err, data) => {
        console.log(gradient.pastel.multiline(data));
    });
}

async function load(text, seconds = 2000) {
    const spiner = createSpinner(text).start();
    await sleep(seconds);
    spiner.stop();
}

await printAnimated('Math Quiz!!');

// ask questions

await load('Checking answers');

await printFiglet('You won $1000!!!');
