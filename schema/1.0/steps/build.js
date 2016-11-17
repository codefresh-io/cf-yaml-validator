/**
 * Defines the build step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class Build extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'build';
    }

    static getSchema() {
        const buildSchema = {
            type:                Joi.string().valid(Build.getType()),
            'working-directory': Joi.string(),
            dockerfile:          Joi.string(),
            'image-name':        Joi.string().required(),
            'build-arguments':   Joi.array().items(Joi.string()),
            tag:                 Joi.string()
        };
        return Object.assign(buildSchema, BaseSchema._commonSchema());
    }
}
// Exported objects/methods
module.exports = Build;