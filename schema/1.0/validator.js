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
const ValidatorError = require('../../validator-error');
const BaseSchema = require('./base-schema');
const PendingApproval = require('./steps/pending-approval');
let outputFormat;

class Validator {

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static _throwValidationErrorAccordingToForamt(message, error) {
        const err = new ValidatorError(message, error);
        switch (outputFormat) {
            case 'object':
                throw err;
            case 'message':
                throw err;
            default:
                throw err.details;
        }
    }

    static _validateUniqueStepNames(objectModel) {
        // get all step names:
        const stepNames = _.flatMap(objectModel.steps, (step) => {
            return step.steps ? Object.keys(step.steps) : [];
        });
        // get duplicate step names from step names:
        const duplicateSteps = _.filter(stepNames, (val, i, iteratee) => _.includes(iteratee, val, i + 1));
        if (duplicateSteps.length > 0) {
            const message = `Failed validation: Duplicate step name: ${duplicateSteps.toString()} : exist more than once.`;
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
                    docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/advanced-workflows/#parallel-pipeline-mode',
                    actionItems: `Please rename ${duplicateSteps.toString()} steps`,
                },
            ];

            Validator._throwValidationErrorAccordingToForamt(`Failed validation: Duplicate step name: ${duplicateSteps.toString()} : exist more than once.`, error);
        }
    }

    static _validateRootSchema(objectModel) {
        const rootSchema = Joi.object({
            version: Joi.number().positive().required(),
            steps: Joi.object().pattern(/^.+$/, Joi.object()).required(),
            stages: Joi.array().items(Joi.string()),
            mode: Joi.string().valid('sequential', 'parallel'),
            fail_fast: [Joi.object(), Joi.string(), Joi.boolean()],
            success_criteria: BaseSchema.getSuccessCriteriaSchema(),
        });
        try {
            Joi.assert(objectModel, rootSchema);
        } catch (err) {
            const message = err.message;
            const error = new Error(message);
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
                    docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                    actionItems: `Please make sure you have all the requiered fields`,
                },
            ];
            Validator._throwValidationErrorAccordingToForamt(message, error);
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

    static _validateStepSchema(objectModel) {
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
                                    docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/advanced-workflows/',
                                    actionItems: `Please make sure you have all the requiered fields`,
                                },
                            ];
                            Validator._throwValidationErrorAccordingToForamt(`${stepName} failed validation: [${error.message}]`, error);
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
                            docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                            actionItems: `Please make sure you have all the requiered fields`,
                        },
                    ];
                    Validator._throwValidationErrorAccordingToForamt(`${name} failed validation: [${error.message}. value: ${step.steps}]`, error);
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
            const validationResult = Joi.validate(step, stepSchema, { abortEarly: true });
            if (validationResult.error) {

                // regex to split joi's error path so that we can use lodah's _.get
                // we make sure split first ${{}} annotations before splitting by dots (.)
                const joiPathSplitted = _.get(validationResult, 'error.details[0].path')
                    .split(/(\$\{\{[^}]*}})|([^.]+)/g);

                // TODO: I (Itai) put this code because i could not find a good regex to do all the job
                const originalPath = [];
                _.forEach(joiPathSplitted, (keyPath) => {
                    if (keyPath && keyPath !== '.') {
                        originalPath.push(keyPath);
                    }
                });

                const originalFieldValue = _.get(validationResult, ['value', ...originalPath]);

                Validator._throwValidationErrorAccordingToForamt(`${stepName} failed validation: [${validationResult.error.message}. 
                value: ${originalFieldValue}]`, validationResult.error);
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
     * @param output desire output format YAML
     * @throws An error containing the details of the validation failure
     */
    static validate(objectModel, output = 'message') {
        outputFormat = output;
        Validator._validateUniqueStepNames(objectModel);
        Validator._validateRootSchema(objectModel);
        Validator._validateStepSchema(objectModel);
    }
}

// Exported objects/methods
module.exports = Validator.validate;
