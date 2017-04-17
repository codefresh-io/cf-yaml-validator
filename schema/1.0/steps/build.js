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

    getSchema() {
        let buildProperties = {
            type:              Joi.string().valid(Build.getType()),
            working_directory: Joi.string(),
            dockerfile:        Joi.alternatives()
                                   .try(Joi.string(), Joi.object({ content: Joi.string() })),
            no_cache:          Joi.boolean(),
            squash:            Joi.boolean(),
            repository:        Joi.string().required(),
            build_arguments:   Joi.array().items(Joi.string()),
            tag:               Joi.string(),
            metadata:          Joi.object({
                set: Build._getMetadataAnnotationSetSchema()
            })

        };
        return this._createSchema(buildProperties);
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true })
            .rename('image-name', 'image_name', { ignoreUndefined: true })
            .rename('build-arguments', 'build_arguments', { ignoreUndefined: true });
    }
}
// Exported objects/methods
module.exports = Build;