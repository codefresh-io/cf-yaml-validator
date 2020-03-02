/**
 * Defines the build step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');
const registryValidation = require('../validations/registry');

class Build extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'build';
    }

    getSchema(opts = {}) {
        const buildProperties = {
            type: Joi.string().valid(Build.getType()),
            working_directory: Joi.string(),
            dockerfile: Joi.alternatives()
                .try(Joi.string(), Joi.object({ content: Joi.string() })),
            no_cache: Joi.boolean(),
            no_cf_cache: Joi.boolean(),
            squash: Joi.boolean(),
            image_name: Joi.string().required(),
            build_arguments: Joi.array().items(Joi.string()),
            tag: opts.tagIsRequired ? Joi.string().required() : Joi.string(),
            metadata: Joi.object({
                set: BaseSchema._getMetadataAnnotationSetSchema()
            }),
            annotations: BaseSchema._getAnnotationsSchema(),
            target: Joi.string(),
            ssh: BaseSchema._getSshSchema(),
            secrets: BaseSchema._getSecretsSchema(),
            progress: Joi.string(),
            buildkit: Joi.boolean(),
            registry: Joi.string()
        };
        return this._createSchema(buildProperties);
    }

    static validateStep(step, yaml, name, context) {
        return registryValidation.validate(step, yaml, name, context);
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true })
            .rename('image-name', 'image_name', { ignoreUndefined: true })
            .rename('build-arguments', 'build_arguments', { ignoreUndefined: true });
    }
}
// Exported objects/methods
module.exports = Build;
