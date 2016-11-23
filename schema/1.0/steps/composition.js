/**
 * Defines the composition step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class Composition extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'composition';
    }

    getSchema() {
        let compositionProperties = {
            type:                     Joi.string().valid(Composition.getType()),
            'working_directory':      Joi.string(),
            composition:              Joi.alternatives(Joi.object(), Joi.string()).required(),
            'composition_candidates': Joi.object().required(),
            'composition_variables':  Joi.array().items(Joi.string()),
        };
        return this._createSchema(compositionProperties).unknown();
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true })
            .rename('composition-candidates', 'composition_candidates', { ignoreUndefined: true })
            .rename('composition-variables', 'composition_variables', { ignoreUndefined: true });
    }
}
// Exported objects/methods
module.exports = Composition;