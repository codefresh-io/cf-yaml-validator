/**
 * Defines the deploy step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const _ = require('lodash');
const Joi        = require('joi');
const BaseSchema = require('../base-schema');
const { ErrorType, ErrorBuilder } = require('../error-builder');
const { docBaseUrl, DocumentationLinks, IntegrationLinks } = require('../documentation-links');

class Deploy extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'deploy';
    }

    getSchema() {
        const deployProperties = {
            type: Joi.string().valid(Deploy.getType()),
            kind: Joi.string().required(),
            cluster: Joi.string().required(),
            namespace: Joi.string().required(),
            file_path: Joi.string(),
            timeout: Joi.string(),
            service: Joi.when('file_path', {
                is: Joi.string().required(),
                then: Joi.any().forbidden(),
                otherwise: Joi.string().required()
            }),
            candidate: Joi.object({
                image: Joi.string().required(),
                registry: Joi.string().required()
            })
        };
        return this._createSchema(deployProperties).unknown();
    }

    static validateStep(step, yaml, name, context, { ignoreValidation }) {
        const errorPath = 'cluster';
        const key = 'cluster';
        const errors = [];
        const warnings = [];
        if (_.isEmpty(context.clusters)) {
            errors.push(ErrorBuilder.buildError({
                message: 'You have not added a Kubernetes cluster.',
                name,
                yaml,
                code: 300,
                type: ErrorType.Error,
                docsLink: _.get(IntegrationLinks, step.type),
                errorPath,
                actionItems: 'Add one in your account settings to continue.',
            }));
        } else if (step.cluster) {
            if (BaseSchema.isRuntimeVariable(step.cluster)) {
                if (BaseSchema.isRuntimeVariablesNotContainsStepVariable(context.variables, step.cluster)) {
                    const variableName = BaseSchema.getVariableNameFromStep(step.cluster);
                    warnings.push(ErrorBuilder.buildError({
                        message: `Your cluster integration uses a variable '${variableName}' that is not configured and`
                            + ` will fail without defining it.`,
                        name,
                        yaml,
                        code: 301,
                        type: ErrorType.Warning,
                        docsLink: _.get(IntegrationLinks, 'variables'),
                        errorPath: 'variables',
                        key
                    }));
                }
            } else if (!_.some(context.clusters, (obj) => { return obj.selector === step.cluster; })) {
                errors.push(ErrorBuilder.buildError({
                    message: `Cluster '${step.cluster}' does not exist.`,
                    name,
                    yaml,
                    code: 302,
                    type: ErrorType.Error,
                    docsLink: _.get(IntegrationLinks, step.type),
                    errorPath,
                    key,
                    actionItems: 'Please check the spelling or add a new cluster in your account settings.',
                }));
            }
        } else if (!step.cluster && context.clusters.length > 1 && !ignoreValidation) {
            warnings.push(ErrorBuilder.buildError({
                message: `You are using the default cluster integration.`,
                name,
                yaml,
                code: 303,
                type: ErrorType.Warning,
                docsLink: _.get(DocumentationLinks, step.type, docBaseUrl),
                errorPath,
                actionItems: 'You have additional integrations configured which can be used if defined explicitly.',
            }));
        }
        return { errors, warnings };
    }

}
// Exported objects/methods
module.exports = Deploy;
