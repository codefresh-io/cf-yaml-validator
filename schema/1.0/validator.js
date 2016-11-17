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

class Validator10 {

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static _validateRootSchema(objectModel) {
        const rootSchema = Joi.object({
            version: Joi.number().positive().required(),
            steps:   Joi.object().pattern(/^.+$/, Joi.object()).required()
        });
        Joi.assert(objectModel, rootSchema);
    }

    static _resolveStepSchemas() {
        const stepsPath          = path.join(__dirname, 'steps');
        const allStepSchemaFiles = fs.readdirSync(stepsPath);
        const stepsSchemaModules = {};
        allStepSchemaFiles.forEach((schemaFile => {
            const stepSchemaModule = require(path.join(stepsPath, schemaFile));
            if (stepSchemaModule.getType()) {
                stepsSchemaModules[stepSchemaModule.getType()] = stepSchemaModule.getSchema();
            }
        }));
        return stepsSchemaModules;
    }

    static _validateStepSchema(objectModel) {
        const stepsSchemas = Validator10._resolveStepSchemas();
        const steps        = objectModel.steps;
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
            const validationResult = Joi.validate(step, stepSchema);
            if (validationResult.error) {
                throw new Error(`${stepName} failed validation: ${validationResult.error.message}`);
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
        Validator10._validateRootSchema(objectModel);
        Validator10._validateStepSchema(objectModel);
    }
}
// Exported objects/methods
module.exports = Validator10.validate;
