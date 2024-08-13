/**
 * Defines the freestyle step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');
const registryValidation = require('../validations/registry');
const { ErrorBuilder } = require('./../error-builder');

class Freestyle extends BaseSchema {

    static _getDebugSchema() {
        return Joi.object({
            phases: Joi.object({
                before: Joi.boolean(),
                override: Joi.boolean(),
                after: Joi.boolean()
            })
        });
    }

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'freestyle';
    }

    getSchema() {
        const freestyleProperties = {
            working_directory: Joi.string(),
            image: Joi.string().required(),
            commands: Joi.array().items(Joi.string()),
            cmd: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
            volumes: Joi.array().items(Joi.string().regex(/:/)),
            environment: Joi.array().items(Joi.string()),
            entry_point: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
            shell: Joi.string().valid('sh', 'bash'),
            services: Joi.alternatives().try(Joi.object(), Joi.array()),
            debug: Freestyle._getDebugSchema(),
            registry_context: Joi.string(),
            registry_contexts: Joi.object().disallow().error(ErrorBuilder.buildJoiError({
                message: `'registry_contexts' not allowed`,
                path: 'registry_contexts'
            })),
            role_arn: Joi.string(),
        };
        return this._createSchema(freestyleProperties)
            .without('commands', 'cmd') // make sure cmd and commands are mutually exclusive AND optional
            .without('shell', 'cmd') // make sure cmd and commands are mutually exclusive AND optional
            .unknown();
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true });
    }

    static validateStep(step, yaml, name, context) {
        return registryValidation.validateRegistryContext(step, yaml, name, context);
    }
}
// Exported objects/methods
module.exports = Freestyle;
