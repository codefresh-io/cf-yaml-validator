/**
 * Defines the composition step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('../base-schema');
const registryValidation = require('../validations/registry');
const { ErrorBuilder } = require('../error-builder');

class Composition extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'composition';
    }

    getSchema() {
        const compositionProperties = {
            'type': Joi.string().valid(Composition.getType()),
            'working_directory': Joi.string(),
            'composition': Joi.alternatives(Joi.object(), Joi.string()).required(),
            // allow any step name as composition candidate, and disallow working_directory as step field
            'composition_candidates': Joi.object().pattern(/^/, Joi.object().keys({
                working_directory: Joi.any().forbidden()
            }).unknown()).required(),
            'composition_variables': Joi.array().items(Joi.string()),
            'registry_contexts': Joi.array().items(Joi.string()),
            'registry_context': Joi.object().disallow().error(ErrorBuilder.buildJoiError({
                message: `'registry_context' not allowed`,
                path: 'registry_context'
            })),
        };
        return this._createSchema(compositionProperties).unknown();
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true })
            .rename('composition-candidates', 'composition_candidates', { ignoreUndefined: true })
            .rename('composition-variables', 'composition_variables', { ignoreUndefined: true });
    }

    static validateStep(step, yaml, name, context) {
        return registryValidation.validateRegistryContext(step, yaml, name, context);
    }
}
// Exported objects/methods
module.exports = Composition;
