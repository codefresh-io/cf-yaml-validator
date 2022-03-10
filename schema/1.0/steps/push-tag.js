/**
 * Defines the push step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi = require('joi');
const BaseSchema = require('./../base-schema');

class PushTag extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'push-tag';
    }

    getSchema() {

        const pushTagsProperties = {
            title: Joi.string(),
            type: Joi.string().valid(PushTag.getType()),
            image_name: Joi.string().required(),
            tags: Joi.array().items(Joi.string()).required(),
            region: Joi.string(),
            role_arn: Joi.string(),
            aws_session_name: Joi.string(),
            aws_duration_seconds: Joi.number(),
        };

        return this._createSchema(pushTagsProperties);
    }
}
// Exported objects/methods
module.exports = PushTag;
