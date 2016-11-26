/**
 * Defines the composition launch step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class CompositionLaunch extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'launch-composition';
    }

    getSchema() {
        let compositionProperties = {
            type:                    Joi.string().valid(CompositionLaunch.getType()),
            'working_directory':     Joi.string(),
            composition:             Joi.alternatives(Joi.object(), Joi.string()).required(),
            'composition_variables': Joi.array().items(Joi.string()),
        };
        return this._createSchema(compositionProperties).unknown();
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', {ignoreUndefined: true})
            .rename('composition-variables', 'composition_variables', {ignoreUndefined: true});
    }
}
// Exported objects/methods
module.exports = CompositionLaunch;