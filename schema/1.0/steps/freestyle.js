/**
 * Defines the freestyle step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class Freestyle extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'freestyle';
    }

    static getSchema() {
        const compositionLaunchSchema = {
            'working-directory': Joi.string(),
            image:               Joi.string().required(),
            commands:            Joi.array().items(Joi.string()),
            environment:         Joi.array().items(Joi.string())
        };
        return Object.assign(compositionLaunchSchema, BaseSchema._commonSchema());
    }
}
// Exported objects/methods
module.exports = Freestyle;