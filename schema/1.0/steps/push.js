/**
 * Defines the push step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const _ = require('lodash');
const Joi        = require('joi');
const BaseSchema = require('./../base-schema');
const { ErrorType, ErrorBuilder } = require('./../error-builder');
const { docBaseUrl, DocumentationLinks, IntegrationLinks } = require('./../documentation-links');

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

    static validateStep(step, yaml, name, context) {
        const errorPath = 'registry';
        const key = 'registry';
        const errors = [];
        const warnings = [];
        const registry = BaseSchema._getFieldFromStep(step, 'registry');
        if (_.isEmpty(context.registries)) {
            errors.push(ErrorBuilder.buildError({
                message: 'You have not added your Registry integration.',
                name,
                yaml,
                type: ErrorType.Error,
                code: 200,
                docsLink: _.get(IntegrationLinks, step.type),
                errorPath,
            }));
        } else if (registry) {
            if (BaseSchema.isRuntimeVariable(registry)) {
                if (BaseSchema.isRuntimeVariablesNotContainsStepVariable(context.variables, registry)) {
                    warnings.push(ErrorBuilder.buildError({
                        message: 'Your Registry Integration uses a variable that is not configured and will fail without defining it.',
                        name,
                        yaml,
                        code: 201,
                        type: ErrorType.Warning,
                        docsLink: _.get(IntegrationLinks, 'variables'),
                        errorPath: 'variables',
                        key
                    }));
                }
            } else if (!_.some(context.registries, (obj) => { return obj.name ===  registry; })) {
                errors.push(ErrorBuilder.buildError({
                    message: `Registry '${registry}' does not exist.`,
                    name,
                    yaml,
                    code: 202,
                    type: ErrorType.Error,
                    docsLink: _.get(IntegrationLinks, step.type),
                    errorPath,
                    key
                }));
            }
        } else if (!registry && context.registries.length > 1) {
            const defaultRegistryName = BaseSchema._getDefaultNameFromContext(context.registries, 'name', { default: true });
            warnings.push(ErrorBuilder.buildError({
                message: `You are using your default Registry Integration '${defaultRegistryName}'.`,
                name,
                yaml,
                code: 203,
                type: ErrorType.Warning,
                docsLink: _.get(DocumentationLinks, step.type, docBaseUrl),
                errorPath,
                actionItems: 'You have additional integrations configured which can be used if defined explicitly.'
            }));
        }
        return { errors, warnings };
    }
}
// Exported objects/methods
module.exports = Push;
