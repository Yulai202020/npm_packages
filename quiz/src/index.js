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

async function checkAnswers(
    isCorrect,
    text = 'Checking answer',
    seconds = 2000
) {
    const spiner = createSpinner(text).start();
    await sleep(seconds);

    if (isCorrect) {
        spiner.success({ text: 'Nice work!' });
        return true;
    } else {
        spiner.error({ text: 'Game over...' });
        process.exit(1);
    }
}

async function ask_list(question, choices, true_ans) {
    const anwers = await inquirer.prompt({
        name: 'output',
        type: 'list',
        message: question,
        choices: choices,
    });

    await checkAnswers(anwers.output === true_ans);
}

await printAnimated('Math Quiz!!');

await ask_list('1+1=?', ['idk', '2', '3'], '2');
await ask_list('2+10=?', ['idk', '8', '12'], '12');
await ask_list('3*2=?', ['idk', '6', '9'], '6');
await ask_list('6*6=?', ['idk', '12', '36'], '36');
await ask_list('sqrt(25)=?', ['idk', '1', '-1'], '5');

await printFiglet('You won $1000!!!');
