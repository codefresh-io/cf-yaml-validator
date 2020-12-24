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
            'git': Joi.string(),
            'use_proxy': Joi.boolean(),
        };
        return this._createSchema(gitCloneProperties);
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', { ignoreUndefined: true });
    }

    static validateStep(step, yaml, name, context, { ignoreValidation }) {
        const errorPath = 'git';
        const key = 'git';
        const errors = [];
        const warnings = [];
        const git = BaseSchema._getFieldFromStep(step, 'git');
        if (_.isEmpty(context.git)) {
            errors.push(ErrorBuilder.buildError({
                message: 'You have not added a Git integration.',
                name,
                yaml,
                code: 100,
                type: ErrorType.Error,
                docsLink: _.get(IntegrationLinks, step.type),
                errorPath,
                actionItems: 'Add one in your account settings to continue.',
            }));
        } else if (git) {
            if (BaseSchema.isRuntimeVariable(git)) {
                if (BaseSchema.isRuntimeVariablesNotContainsStepVariable(context.variables, git)) {
                    const variableName = BaseSchema.getVariableNameFromStep(git);
                    warnings.push(ErrorBuilder.buildError({
                        message: `Your Git integration uses a variable '${variableName}' that is not configured and will fail without defining it.`,
                        name,
                        yaml,
                        code: 101,
                        type: ErrorType.Warning,
                        docsLink: _.get(IntegrationLinks, 'variables'),
                        errorPath: 'variables',
                        key
                    }));
                }
            } else if (git !== 'CF-default' && !_.some(context.git, (obj) => { return obj.metadata.name === git; })) {
                errors.push(ErrorBuilder.buildError({
                    message: `Git '${git}' does not exist.`,
                    name,
                    yaml,
                    code: 102,
                    type: ErrorType.Error,
                    docsLink: _.get(IntegrationLinks, step.type),
                    errorPath,
                    key,
                    actionItems: 'Please check the spelling or add a new Git integration in your account settings.',
                }));
            }
        } else if (!git && context.git.length > 1 && !ignoreValidation) {
            const defaultGitName = BaseSchema._getDefaultNameFromContext(context.git, 'metadata.name', { metadata: { default: true } });
            warnings.push(ErrorBuilder.buildError({
                message: `You are using the default Git integration '${defaultGitName}'.`,
                name,
                yaml,
                code: 103,
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
module.exports = GitClone;
