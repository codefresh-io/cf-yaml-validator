/**
 * Defines the push step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class Push extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'push';
    }

    getSchema() {

        const pushTagsProperties = {
            type: Joi.string().valid(Push.getType()),
            provider: Joi.string().regex(/^standard|docker|ecr$/),
            candidate: Joi.string().required(),
            registry: Joi.string(),
            credentials: BaseSchema._getCredentialsSchema(),
            tag: Joi.string(),
            tags: Joi.array().items(Joi.string()),
            image_name: Joi.string(),
            accessKeyId: Joi.string(),
            secretAccessKey: Joi.string(),
            region: Joi.string()

        };

        return this._createSchema(pushTagsProperties);
    }
}
// Exported objects/methods
module.exports = Push;
