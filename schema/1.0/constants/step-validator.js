'use strict';

const GitClone = require('../steps/git-clone');
const Deploy = require('../steps/deploy');
const Push = require('../steps/push');
const Build = require('../steps/build');
const Freestyle = require('../steps/freestyle');
const Composition = require('../steps/composition');

const StepValidator = {
    'git-clone': GitClone,
    'deploy': Deploy,
    'push': Push,
    'build': Build,
    'freestyle': Freestyle,
    'composition': Composition
};


module.exports = {
    StepValidator
}