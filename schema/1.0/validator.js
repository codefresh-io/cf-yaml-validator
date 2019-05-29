/**
 * The actual Validation module.
 * Creates a Joi schema and tests the deserialized YAML descriptor
 */


'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const colors = require('colors');
const Table = require('cli-table3');
const ValidatorError = require('../../validator-error');
const BaseSchema = require('./base-schema');
const PendingApproval = require('./steps/pending-approval');

let totalErrors;
const docBaseUrl = process.env.DOCS_BASE_URL || 'https://codefresh.io/docs/docs/codefresh-yaml/steps';
const DocumentationLinks = {
    'freestyle': `${docBaseUrl}/freestyle/`,
    'build': `${docBaseUrl}/build/`,
    'push': `${docBaseUrl}/push/`,
    'deploy': `${docBaseUrl}/deploy/`,
    'git-clone': `${docBaseUrl}/git-clone/`,
    'launch-composition': `${docBaseUrl}/launch-composition/`,
    'pending-approval': `${docBaseUrl}/approval/`,
};

class Validator {

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static _throwValidationErrorAccordingToFormat(outputFormat) {
        Validator._sortErrorAccordingLineNumber();
        const err = new ValidatorError(totalErrors);
        switch (outputFormat) {
            case 'printify':
                Validator._printify(err);
                break;
            case 'message':
                Validator._message(err);
                break;
            case 'lint':
                Validator._lint(err);
                break;
            default:
                throw err;
        }
    }

    static _getErrorLineNumber({ yaml, stepName, key }) {
        if (!yaml) {
            return;
        }
        const requireStepValidation = !!stepName;
        const requirekeyValidation = !!key;
        let errorLine = 0;
        let stepFound = false;
        const stepNameRegex = new RegExp(`${stepName}:`, 'g');
        const keyRegex = new RegExp(`${key}:`, 'g');
        const yamlArray = yaml.split('\n');

        _.forEach(yamlArray, (line, number) => { // eslint-disable-line
            if (requireStepValidation && stepNameRegex.exec(line)) {
                errorLine = number + 1;
                if (!requirekeyValidation) {
                    return false;
                }
                stepFound = true;
            }
            if ((!requireStepValidation || stepFound) && keyRegex.exec(line)) {
                errorLine = number + 1;
                return false;
            }
        });
        return errorLine; // eslint-disable-line
    }

    static _addError(error) {
        totalErrors.details = _.concat(totalErrors.details, error.details);
    }

    static _sortErrorAccordingLineNumber() {
        totalErrors.details = _.sortBy(totalErrors.details, [error => error.lines]);
    }

    static _printify(err) {
        _.forEach(totalErrors.details, (error) => {
            const table = new Table({
                style: { header: [] },
                colWidths: [20, 100],
                wordWrap: true,
            });
            if (error.message) {
                table.push({ [colors.red('Message')]: colors.red(error.message) });
            }
            if (error.type) {
                table.push({ [colors.green('Error Type')]: error.type });
            }
            if (error.level) {
                table.push({ [colors.green('Error Level')]: error.level });
            }
            if (error.stepName) {
                table.push({ [colors.green('Step Name')]: error.stepName });
            }
            if (error.docsLink) {
                table.push({ [colors.green('Documentation Link')]: error.docsLink });
            }
            if (error.actionItems) {
                table.push({ [colors.green('Action Items')]: error.actionItems });
            }
            if (error.lines) {
                table.push({ [colors.green('Error Lines')]: error.lines });
            }
            err.message += `\n${table.toString()}`;
        });
        throw err;
    }

    static _message(err) {
        _.forEach(totalErrors.details, (error) => {
            err.message += `${error.message}\n`;
        });
        throw err;
    }

    static _lint(err) {
        err.message = `${colors.red('\n')}`;
        const table = new Table({
            chars: {
                'top': '',
                'top-mid': '',
                'top-left': '',
                'top-right': '',
                'bottom': '',
                'bottom-mid': '',
                'bottom-left': '',
                'bottom-right': '',
                'left': '',
                'left-mid': '',
                'mid': '',
                'mid-mid': '',
                'right': '',
                'right-mid': '',
                'middle': ''
            },
            style: {
                'head': [], 'border': [], 'padding-left': 1, 'padding-right': 1
            },
            colWidths: [5, 10, 80, 80],
            wordWrap: true,
        });
        _.forEach(totalErrors.details, (error) => {
            table.push([error.lines, colors.red('error'), error.message, error.docsLink]);
        });

        err.message +=  `\n${table.toString()}\n`;
        throw err;
    }


    static _validateUniqueStepNames(objectModel, yaml) {
        // get all step names:
        const stepNames = _.flatMap(objectModel.steps, (step) => {
            return step.steps ? Object.keys(step.steps) : [];
        });
        // get duplicate step names from step names:
        const duplicateSteps = _.filter(stepNames, (val, i, iteratee) => _.includes(iteratee, val, i + 1));
        if (duplicateSteps.length > 0) {
            _.forEach(duplicateSteps, (stepName) => {
                const message = `step name exist more than once`;
                const error = new Error(message);
                error.name = 'ValidationError';
                error.isJoi = true;
                error.details = [
                    {
                        message,
                        type: 'Validation',
                        path: 'steps',
                        context: {
                            key: 'steps',
                        },
                        level: 'step',
                        stepName,
                        docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/advanced-workflows/#parallel-pipeline-mode',
                        actionItems: `Please rename ${stepName} steps`,
                        lines: Validator._getErrorLineNumber({ yaml, stepName }),
                    },
                ];

                Validator._addError(error);
            });

        }
    }

    static _validateRootSchema(objectModel, yaml) {
        const rootSchema = Joi.object({
            version: Joi.number().positive().required(),
            steps: Joi.object().pattern(/^.+$/, Joi.object()).required(),
            stages: Joi.array().items(Joi.string()),
            mode: Joi.string().valid('sequential', 'parallel'),
            fail_fast: [Joi.object(), Joi.string(), Joi.boolean()],
            success_criteria: BaseSchema.getSuccessCriteriaSchema(),
        });
        const validationResult = Joi.validate(objectModel, rootSchema, { abortEarly: false });
        if (validationResult.error) {
            _.forEach(validationResult.error.details, (err) => {
                // regex to split joi's error path so that we can use lodah's _.get
                // we make sure split first ${{}} annotations before splitting by dots (.)
                const joiPathSplitted = err.path
                    .split(/(\$\{\{[^}]*}})|([^.]+)/g);

                // TODO: I (Itai) put this code because i could not find a good regex to do all the job
                const originalPath = [];
                _.forEach(joiPathSplitted, (keyPath) => {
                    if (keyPath && keyPath !== '.') {
                        originalPath.push(keyPath);
                    }
                });

                const originalFieldValue = _.get(validationResult, ['value', ...originalPath]);
                const message = originalFieldValue ? `${err.message}. Current value: ${originalFieldValue} ` : err.message;
                const error = new Error();
                error.name = 'ValidationError';
                error.isJoi = true;
                error.details = [
                    {
                        message,
                        type: 'Validation',
                        path: 'workflow',
                        context: {
                            key: 'workflow',
                        },
                        level: 'workflow',
                        docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        actionItems: `Please make sure you have all the required fields`,
                        lines: Validator._getErrorLineNumber({ yaml, key: err.path }),
                    },
                ];

                Validator._addError(error);
            });
        }
    }


    static _resolveStepSchemas(objectModel = {}) {
        const stepsPath = path.join(__dirname, 'steps');
        const allStepSchemaFiles = fs.readdirSync(stepsPath);
        const stepsSchemaModules = {};
        allStepSchemaFiles.forEach(((schemaFile) => {
            const StepSchemaModule = require(path.join(stepsPath, schemaFile)); // eslint-disable-line
            if (StepSchemaModule.getType()) {
                stepsSchemaModules[StepSchemaModule.getType()] = new StepSchemaModule(objectModel).getSchema();
            }
        }));
        return stepsSchemaModules;
    }

    static _validateStepSchema(objectModel, yaml) {
        const stepsSchemas = Validator._resolveStepSchemas(objectModel);
        const steps = {};
        _.map(objectModel.steps, (step, name) => {
            if (step.type === 'parallel') {
                if (_.size(step.steps) > 0) {
                    _.map(step.steps, (innerStep, innerName) => {
                        steps[innerName] = innerStep;
                    });
                    for (const stepName in step.steps) { // eslint-disable-line
                        const subStep = steps[stepName];
                        if (_.get(subStep, 'type', 'freestyle') === PendingApproval.getType()) {
                            const error = new Error(`"type" can't be ${PendingApproval.getType()}`);
                            error.name = 'ValidationError';
                            error.isJoi = true;
                            error.details = [
                                {
                                    message: `"type" can't be ${PendingApproval.getType()}`,
                                    type: 'Validation',
                                    path: 'type',
                                    context: {
                                        key: 'type',
                                    },
                                    level: 'step',
                                    stepName,
                                    docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/advanced-workflows/',
                                    actionItems: `Please make sure you have all the required fields`,
                                    lines: Validator._getErrorLineNumber({ yaml, stepName }),
                                },
                            ];
                            Validator._addError(error);
                        }
                    }
                } else {
                    const error = new Error('"steps" is required and must be an array steps');
                    error.name = 'ValidationError';
                    error.isJoi = true;
                    error.details = [
                        {
                            message: '"steps" is required and must be an array of type steps',
                            type: 'Validation',
                            path: 'steps',
                            context: {
                                key: 'steps',
                            },
                            level: 'workflow',
                            docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                            actionItems: `Please make sure you have all the required fields`,
                        },
                    ];
                    Validator._addError(error);
                }
            } else {
                steps[name] = step;
            }
        });
        for (const stepName in steps) { // eslint-disable-line
            const step = steps[stepName];
            let { type } = step;
            if (!type) {
                type = 'freestyle';
            }
            const stepSchema = stepsSchemas[type];
            if (!stepSchema) {
                console.log(`Warning: no schema found for step type '${type}'. Skipping validation`);
                continue; // eslint-disable-line no-continue
            }
            const validationResult = Joi.validate(step, stepSchema, { abortEarly: false });
            if (validationResult.error) {
                _.forEach(validationResult.error.details, (err) => {
                    // regex to split joi's error path so that we can use lodah's _.get
                    // we make sure split first ${{}} annotations before splitting by dots (.)
                    const joiPathSplitted = err.path
                        .split(/(\$\{\{[^}]*}})|([^.]+)/g);

                    // TODO: I (Itai) put this code because i could not find a good regex to do all the job
                    const originalPath = [];
                    _.forEach(joiPathSplitted, (keyPath) => {
                        if (keyPath && keyPath !== '.') {
                            originalPath.push(keyPath);
                        }
                    });

                    const originalFieldValue = _.get(validationResult, ['value', ...originalPath]);
                    const message = originalFieldValue ? `${err.message}. Current value: ${originalFieldValue} ` : err.message;
                    const error = new Error();
                    error.name = 'ValidationError';
                    error.isJoi = true;
                    error.details = [
                        {
                            message,
                            type: 'Validation',
                            path: 'steps',
                            context: {
                                key: 'steps',
                            },
                            level: 'step',
                            stepName,
                            docsLink: _.get(DocumentationLinks, `${type}`, docBaseUrl),
                            actionItems: `Please make sure you have all the required fields`,
                            lines: Validator._getErrorLineNumber({ yaml, stepName, key: err.path }),
                        },
                    ];

                    Validator._addError(error);
                });


            }
        }
    }

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    /**
     * Validates a model of the deserialized YAML
     *
     * @param objectModel Deserialized YAML
     * @param outputFormat desire output format YAML
     * @throws An error containing the details of the validation failure
     */
    static validate(objectModel, outputFormat = 'message', yaml) {
        totalErrors = {
            details: [],
        };
        Validator._validateUniqueStepNames(objectModel, yaml);
        Validator._validateRootSchema(objectModel, yaml);
        Validator._validateStepSchema(objectModel, yaml);
        if (_.size(totalErrors.details) > 0) {
            Validator._throwValidationErrorAccordingToFormat(outputFormat);
        }
    }
}

// Exported objects/methods
module.exports = Validator.validate;
