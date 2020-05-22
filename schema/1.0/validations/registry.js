'use strict';

const _ = require('lodash');
const BaseSchema = require('./../base-schema');
const { ErrorType, ErrorBuilder } = require('./../error-builder');
const { docBaseUrl, DocumentationLinks, IntegrationLinks } = require('./../documentation-links');

const isWebUri = function (s) {
    if (s) {
        const pattern = new RegExp('^((ft|htt)ps?:\\/\\/)?' // protocol
            + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' // domain name and extension
            + '((\\d{1,3}\\.){3}\\d{1,3}))' // OR ip (v4) address
            + '(\\:\\d+)?' // port
            + '(\\/[-a-z\\d%@_.~+&:]*)*' // path
            + '(\\?[;&a-z\\d%@_.,~+&:=-]*)?' // query string
            + '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
        return !!pattern.test(s);
    }
    return false;
};

const validateRegistryContext = function (step,
    yaml,
    name,
    context) {
    const errors = [];
    const warnings = [];
    const errorPath = 'registry_contexts';
    const key = 'registry_contexts';
    const registryContext = BaseSchema._getFieldFromStep(step, 'registry_context');
    const registryContexts = BaseSchema._getFieldFromStep(step, 'registry_contexts');
    const stepType = _.get(step, 'type', 'freestyle');
    if (registryContexts && _.isArray(registryContexts)) {
        const domains = [];
        let hasDomainError = false;
        registryContexts.forEach((registryCtx) => {
            if (!registryCtx || BaseSchema.isRuntimeVariable(registryCtx)) {
                return;
            }
            const registry = _.find(context.registries, { name: registryCtx });
            if (!registry) {
                errors.push(ErrorBuilder.buildError({
                    message: `Registry '${registryCtx}' does not exist.`,
                    name,
                    yaml,
                    code: 202,
                    type: ErrorType.Error,
                    docsLink: _.get(IntegrationLinks, stepType),
                    errorPath,
                    key,
                    actionItems: 'Please check the spelling or add a new registry in your account settings.',
                }));
            } else {
                if (_.includes(domains, registry.domain) && !hasDomainError) {
                    hasDomainError = true;
                    errors.push(ErrorBuilder.buildError({
                        message: `Registry contexts contains registries with same domain '${registry.domain}'`,
                        name,
                        yaml,
                        code: 207,
                        type: ErrorType.Error,
                        docsLink: _.get(DocumentationLinks, stepType),
                        errorPath,
                        key,
                        actionItems: 'Please make sure that there is no more than one registry from the same domain',
                    }));
                }
                domains.push(registry.domain);
            }
        });
    }

    if (registryContext && !_.isArray(registryContext) && !BaseSchema.isRuntimeVariable(registryContext)
        && !_.some(context.registries, (obj) => { return obj.name ===  registryContext; })) {
        errors.push(ErrorBuilder.buildError({
            message: `Registry '${registryContext}' does not exist.`,
            name,
            yaml,
            code: 202,
            type: ErrorType.Error,
            docsLink: _.get(IntegrationLinks, stepType),
            errorPath,
            key: 'registry_context',
            actionItems: 'Please check the spelling or add a new registry in your account settings.',
        }));
    }
    return { errors, warnings };
};

const validate = function (step,
    yaml,
    name,
    context,
    {
        handleIfNoRegistriesOnAccount, handleIfNoRegistryExcplicitlyDefined, ignoreValidation, handleCFCRRemovalUseCase
    }) {
    const errorPath = 'registry';
    const key = 'registry';
    const { errors, warnings } = validateRegistryContext(step, yaml, name, context);
    const registry = BaseSchema._getFieldFromStep(step, 'registry');

    if (registry && !_.isString(registry)) {
        return { errors, warnings };
    }

    if (handleCFCRRemovalUseCase && !registry && !step.disable_push && !context.autoPush) {
        errors.push(ErrorBuilder.buildError({
            message: `'registry' is required`,
            name,
            yaml,
            type: ErrorType.Error,
            code: 204,
            docsLink: _.get(DocumentationLinks, step.type),
            errorPath
        }));
    }

    const hasDefaultRegistry = _.find(context.registries, reg => reg.default);
    if (handleCFCRRemovalUseCase && context.autoPush && !registry && !hasDefaultRegistry) {
        warnings.push(ErrorBuilder.buildError({
            message: `The image that will be built will not be pushed`,
            name,
            yaml,
            type: ErrorType.Warning,
            code: 205,
            docsLink: _.get(DocumentationLinks, step.type),
            errorPath
        }));
    }

    if (isWebUri(registry)) {
        // Skips validation when registry field contains url.
        // Example of this pipeline located at __tests__/test-yamls/yaml-with-registry-url.yml.
        return { errors, warnings };
    }
    if (_.isEmpty(context.registries) && handleIfNoRegistriesOnAccount) {
        errors.push(ErrorBuilder.buildError({
            message: 'You have not added a registry integration.',
            name,
            yaml,
            type: ErrorType.Error,
            code: 200,
            docsLink: _.get(IntegrationLinks, step.type),
            errorPath,
            actionItems: 'Add one in your account settings to continue.',
        }));
    } else if (registry) {
        if (BaseSchema.isRuntimeVariable(registry)) {
            if (BaseSchema.isRuntimeVariablesNotContainsStepVariable(context.variables, registry)) {
                const variableName = BaseSchema.getVariableNameFromStep(registry);
                warnings.push(ErrorBuilder.buildError({
                    message: `Your registry integration uses a variable '${variableName}' that is not configured and will fail without defining it.`,
                    name,
                    yaml,
                    code: 201,
                    type: ErrorType.Warning,
                    docsLink: _.get(IntegrationLinks, 'variables'),
                    errorPath: 'variables',
                    key,
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
                key,
                actionItems: 'Please check the spelling or add a new registry in your account settings.',
            }));
        }
    } else if (!registry && context.registries.length > 1 && handleIfNoRegistryExcplicitlyDefined && !ignoreValidation) {
        const defaultRegistryName = BaseSchema._getDefaultNameFromContext(context.registries, 'name', { default: true });
        warnings.push(ErrorBuilder.buildError({
            message: `You are using the default registry integration '${defaultRegistryName}'.`,
            name,
            yaml,
            code: 203,
            type: ErrorType.Warning,
            docsLink: _.get(DocumentationLinks, step.type, docBaseUrl),
            errorPath,
            actionItems: 'You have additional integrations configured which can be used if defined explicitly.'
        }));
    }

    const provider = _.get(step, 'provider', _.get(step, 'arguments.provider', {}));

    if (_.get(provider, 'type', 'cf') === 'gcb') {
        if (!_.get(provider, 'arguments.google_app_creds') && !_.some(context.registries, (obj) => { return obj.kind ===  'google'; })) {
            errors.push(ErrorBuilder.buildError({
                message: `provider.arguments.google_app_creds is required`,
                name,
                yaml,
                code: 206,
                type: ErrorType.Error,
                docsLink: _.get(DocumentationLinks, step.type, docBaseUrl),
                errorPath,
                key,
                actionItems: 'Add google container registry as an integration or provide an explicit credentials key',
            }));
        }
    }

    return { errors, warnings };
};

module.exports = {
    validate,
    validateRegistryContext
};
