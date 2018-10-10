/**
 * The actual Validation module.
 * Creates a Joi schema and tests the deserialized YAML descriptor
 */


'use strict';
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi  = require('joi');
const fs   = require('fs');
const path = require('path');
const _    = require('lodash');
const ValidatorError = require('../../validator-error');
const BaseSchema = require('./base-schema');

class Validator {

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static _validateRootSchema(objectModel) {
        const rootSchema = Joi.object({
            version: Joi.number().positive().required(),
            steps:   Joi.object().pattern(/^.+$/, Joi.object()).required(),
            stages: Joi.array().items(Joi.string()),
            mode: Joi.string().valid('sequential', 'parallel'),
            fail_fast: [Joi.object(), Joi.string(), Joi.boolean()],
            success_criteria: BaseSchema.getSuccessCriteriaSchema()
        });
        Joi.assert(objectModel, rootSchema);
    }

    static _resolveStepSchemas(objectModel = {}) {
        const stepsPath          = path.join(__dirname, 'steps');
        const allStepSchemaFiles = fs.readdirSync(stepsPath);
        const stepsSchemaModules = {};
        allStepSchemaFiles.forEach((schemaFile => {
            const StepSchemaModule = require(path.join(stepsPath, schemaFile));
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
            if(step.type === 'parallel'){
                if (_.size(step.steps) > 0 ){
                    _.map(step.steps,(innerStep, innerName) => {
                        steps[innerName] = innerStep;
                    });
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
                                key: 'steps'
                            },
                        }
                    ];

                    throw new ValidatorError(`${name} failed validation: [${error.message}. value: ${step.steps}]`, error);
                }
            } else {
                steps[name] = step;
            }
        });
        for (const stepName in steps) {
            const step = steps[stepName];
            let type   = step.type;
            if (!type) {
                type = 'freestyle';
            }
            const stepSchema = stepsSchemas[type];
            if (!stepSchema) {
                console.log(`Warning: no schema found for step type '${type}'. Skipping validation`);
                continue;
            }
            const validationResult = Joi.validate(step, stepSchema, {abortEarly: true});
            if (validationResult.error) {

                // regex to split joi's error path so that we can use lodah's _.get
                // we make sure split first ${{}} annotations before splitting by dots (.)
                let joiPathSplitted = _.get(validationResult, 'error.details[0].path').split(/(\$\{\{[^}]*}})|([^\.]+)/g);

                // TODO: I (Itai) put this code because i could not find a good regex to do all the job
                let originalPath = [];
                _.forEach(joiPathSplitted, (path) => {
                    if (path && path !== '.') {
                        originalPath.push(path);
                    }
                });

                let originalFieldValue = _.get(validationResult, ['value', ...originalPath]);

                throw new ValidatorError(`${stepName} failed validation: [${validationResult.error.message}. value: ${originalFieldValue}]`, validationResult.error);
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
     * @throws An error containing the details of the validation failure
     */
    static validate(objectModel) {
        Validator._validateRootSchema(objectModel);
        Validator._validateStepSchema(objectModel);
    }
}
// Exported objects/methods
module.exports = Validator.validate;
