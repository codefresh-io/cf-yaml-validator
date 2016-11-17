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
        return 'composition-launch';
    }

    static getSchema() {
        const compositionLaunchSchema = {
            type:                    Joi.string().valid(CompositionLaunch.getType()),
            'working-directory':     Joi.string(),
            composition:             Joi.alternatives(Joi.object(), Joi.string()).required(),
            'composition-variables': Joi.array().items(Joi.string()),
        };
        return Object.assign(compositionLaunchSchema, BaseSchema._commonSchema());
    }
}
// Exported objects/methods
module.exports = CompositionLaunch;