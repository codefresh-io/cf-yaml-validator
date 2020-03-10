'use strict';

const _ = require('lodash');
const BaseSchema = require('./../base-schema');
const { ErrorType, ErrorBuilder } = require('./../error-builder');
const { docBaseUrl, DocumentationLinks, IntegrationLinks } = require('./../documentation-links');

const isWebUri = function (s) {
    if (s) {
        const res = s.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/g);
        return (res !== null);
    }
    return false;
};

const validate = function (step,
    yaml,
    name,
    context,
    { handleIfNoRegistriesOnAccount, handleIfNoRegistryExcplicitlyDefined }) {
    const errorPath = 'registry';
    const key = 'registry';
    const errors = [];
    const warnings = [];
    const registry = BaseSchema._getFieldFromStep(step, 'registry');
    if (isWebUri(registry)) {
        return { errors, warnings };
    }
    if (_.isEmpty(context.registries) && handleIfNoRegistriesOnAccount) {
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
    } else if (!registry && context.registries.length > 1 && handleIfNoRegistryExcplicitlyDefined) {
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
};

module.exports = {
    validate
};
