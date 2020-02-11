/**
 * Defines the git clone step schema
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


class GitClone extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'git-clone';
    }

    getSchema() {
        const gitCloneProperties = {
            'type': Joi.string().valid(GitClone.getType()),
            'working_directory': Joi.string(),
            'repo': Joi.string().required(),
            'revision': Joi.string(),
            'credentials': BaseSchema._getCredentialsSchema(),
            'git': Joi.string()
        };
        return this._createSchema(gitCloneProperties);
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true });
    }

    static validateStep(step, yaml, name, context) {
        const errorPath = 'git';
        const key = 'git';
        const errors = [];
        const warnings = [];
        if (_.isEmpty(context.git)) {
            errors.push(ErrorBuilder.buildError({
                message: 'You have not added your Git integration. Add Git.',
                name,
                yaml,
                code: 100,
                type: ErrorType.Error,
                docsLink: _.get(IntegrationLinks, step.type),
                errorPath,
            }));
        } else if (step.git) {
            if (BaseSchema.isRuntimeVariable(step.git)) {
                if (BaseSchema.isRuntimeVariablesNotContainsStepVariable(context.variables, step.git)) {
                    warnings.push(ErrorBuilder.buildError({
                        message: 'Your Git Integration uses a variable that is not configured and will fail without defining it.',
                        name,
                        yaml,
                        code: 101,
                        type: ErrorType.Warning,
                        docsLink: _.get(IntegrationLinks, step.type),
                        errorPath,
                        key
                    }));
                }
            } else if (!_.some(context.git, (obj) => { return obj.metadata.name === step.git; })) {
                errors.push(ErrorBuilder.buildError({
                    message: `Git '${step.git}' does not exist.`,
                    name,
                    yaml,
                    code: 102,
                    type: ErrorType.Error,
                    docsLink: _.get(IntegrationLinks, step.type),
                    errorPath,
                    key
                }));
            }
        } else if (!step.git && context.git.length > 1) {
            warnings.push(ErrorBuilder.buildError({
                message: `You are using your default Git Integration '${name}'.\
 You have additional integrations configured which can be used if defined explicitly.'`,
                name,
                yaml,
                code: 103,
                type: ErrorType.Warning,
                docsLink: _.get(DocumentationLinks, step.type, docBaseUrl),
                errorPath,
            }));
        }
        return { errors, warnings };
    }
}
// Exported objects/methods
module.exports = GitClone;
