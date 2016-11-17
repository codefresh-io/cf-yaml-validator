#!/usr/bin/env node
'use strict';

const Validator = require('./validator');
const path = require('path');
const yaml = require('js-yaml');
const fs   = require('fs');

process.on('uncaughtException', function (err) {
    console.log(err);
});

const argv = require('yargs')
    .demand(1, 'Please specify a command')
    .usage('Usage: $0 <command> [options]')
    .help('h')
    .alias('h', 'help')
    .command('validate', 'Validate a Codefresh YAML file. Defaults to $PWD/codefresh.yml', {
        file: {
            alias: 'f',
            default: 'codefresh.yml',
            describe: 'Specify the path of the Codefresh YAML file to validate'
        }
    })
    .version()
    .argv;

let pathToYamlFile = argv.f;
if (!path.isAbsolute(pathToYamlFile)) {
    pathToYamlFile = path.join(process.cwd(), pathToYamlFile);
}

if (!fs.existsSync(pathToYamlFile)) {
    console.log(`Error: No file exists at ${pathToYamlFile}`);
    process.exit(1);
}

try {
    const doc = yaml.safeLoad(fs.readFileSync(pathToYamlFile, 'utf8'));
    Validator(doc);
    console.log('Rejoice! Your Codefresh YAML is valid!');
} catch (e) {
    console.log(`Validation error: ${e.message}`);
    process.exit(1);
}

