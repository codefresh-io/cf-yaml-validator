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

    static getSchema() {
        const compositionSchema = {
            type:                     Joi.string().valid(Composition.getType()),
            'working-directory':      Joi.string(),
            composition:              Joi.alternatives(Joi.object(), Joi.string()).required(),
            'composition-candidates': Joi.object(),
            'composition-variables':  Joi.array().items(Joi.string()),
        };
        return Object.assign(compositionSchema, BaseSchema._commonSchema());
    }
}
// Exported objects/methods
module.exports = Composition;