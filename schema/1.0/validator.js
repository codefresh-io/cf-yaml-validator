/**
 * The actual Validation module.
 * Creates a Joi schema and tests the deserialized YAML descriptor
 */


'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const colors = require('colors');
const Table = require('cli-table3');
const ValidatorError = require('../../validator-error');
const BaseSchema = require('./base-schema');
const PendingApproval = require('./steps/pending-approval');
const { ErrorType, ErrorBuilder } = require('./error-builder');
const { docBaseUrl, DocumentationLinks } = require('./documentation-links');
const { StepValidator } = require('./constants/step-validator');
const SuggestArgumentValidation = require('./validations/suggest-argument');

let totalErrors;
let totalWarnings;

const MaxStepLength = 150;

class Validator {

    //------------------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------------------

    static _throwValidationErrorAccordingToFormat(outputFormat) {
        Validator._sortErrorAccordingLineNumber();
        const err = new ValidatorError(totalErrors);
        switch (outputFormat) {
            case 'printify':
                Validator._printify(err);
                break;
            case 'message':
                Validator._message(err);
                break;
            case 'lint':
                Validator._lint(err);
                break;
            default:
                throw err;
        }
    }

    static _throwValidationErrorAccordingToFormatWithWarnings(outputFormat) {
        Validator._sortErrorAccordingLineNumber();
        const err = new ValidatorError(totalErrors);
        if (totalWarnings) {
            Validator._sortWarningAccordingLineNumber();
            err.warningDetails = totalWarnings.details;
        }
        switch (outputFormat) {
            case 'printify':
                Validator._printify(err);
                break;
            case 'message':
                Validator._message(err);
                break;
            case 'lint':
                Validator._lintWithWarnings(err);
                break;
            default:
                throw err;
        }
    }

    static _addError(error) {
        totalErrors.details = _.concat(totalErrors.details, error.details);
    }

    static _addWarning(warning) {
        totalWarnings.details = _.concat(totalWarnings.details, warning.details);
    }

    static _sortWarningAccordingLineNumber() {
        totalWarnings.details = _.sortBy(totalWarnings.details, [error => error.lines]);
    }

    static _sortErrorAccordingLineNumber() {
        totalErrors.details = _.sortBy(totalErrors.details, [error => error.lines]);
    }

    static _printify(err) {
        _.forEach(totalErrors.details, (error) => {
            const table = new Table({
                style: { header: [] },
                colWidths: [20, 100],
                wordWrap: true,
            });
            if (error.message) {
                table.push({ [colors.red('Message')]: colors.red(error.message) });
            }
            if (error.type) {
                table.push({ [colors.green('Error Type')]: error.type });
            }
            if (error.level) {
                table.push({ [colors.green('Error Level')]: error.level });
            }
            if (error.stepName) {
                table.push({ [colors.green('Step Name')]: error.stepName });
            }
            if (error.docsLink) {
                table.push({ [colors.green('Documentation Link')]: error.docsLink });
            }
            if (error.actionItems) {
                table.push({ [colors.green('Action Items')]: error.actionItems });
            }
            if (!_.isUndefined(error.lines)) {
                table.push({ [colors.green('Error Lines')]: error.lines });
            }
            err.message += `\n${table.toString()}`;
        });
        throw err;
    }

    static _message(err) {
        _.forEach(totalErrors.details, (error) => {
            err.message += `${error.message}\n`;
        });
        throw err;
    }

    static _createTable() {
        return new Table({
            chars: {
                'top': '',
                'top-mid': '',
                'top-left': '',
                'top-right': '',
                'bottom': '',
                'bottom-mid': '',
                'bottom-left': '',
                'bottom-right': '',
                'left': '',
                'left-mid': '',
                'mid': '',
                'mid-mid': '',
                'right': '',
                'right-mid': '',
                'middle': ''
            },
            style: {
                'head': [], 'border': [], 'padding-left': 1, 'padding-right': 1
            },
            colWidths: [5, 10, 80, 80],
            wordWrap: true,
        });
    }

    static _getSummarizeMessage() {
        const warningCount = _.get(totalWarnings, 'details.length', 0);
        const errorCount = _.get(totalErrors, 'details.length', 0);
        const problemsCount = errorCount + warningCount;

        let summarize = `✖ ${problemsCount}`;
        if (problemsCount === 1) {
            summarize += ' problem ';
        } else {
            summarize += ' problems ';
        }
        if (errorCount === 1) {
            summarize += `(${errorCount} error, `;
        } else {
            summarize += `(${errorCount} errors, `;
        }
        if (warningCount === 1) {
            summarize += `${warningCount} warning)`;
        } else {
            summarize += `${warningCount} warnings)`;
        }
        return summarize;
    }

    static _lint(err) {
        err.message = `${colors.red('\n')}`;
        const table = Validator._createTable();
        _.forEach(totalErrors.details, (error) => {
            table.push([error.lines, colors.red('error'), error.message, error.docsLink]);
        });
        err.message +=  `\n${table.toString()}\n`;
        throw err;
    }

    static _lintWithWarnings(err) {
        const table = Validator._createTable();
        const warningTable = Validator._createTable();
        const documentationLinks =  new Set();

        if (totalWarnings && !_.isEmpty(totalWarnings.details)) {
            _.forEach(totalWarnings.details, (warning) => {
                warningTable.push([warning.lines, colors.yellow('warning'), warning.message]);
                documentationLinks.add(`Visit ${warning.docsLink} for ${warning.path} documentation\n`);
            });
            err.warningMessage = `${colors.yellow('Yaml validation warnings:\n')}`;
            err.warningMessage += `\n${warningTable.toString()}\n`;

            err.summarize = colors.yellow(Validator._getSummarizeMessage());
        }

        if (!_.isEmpty(totalErrors.details)) {
            _.forEach(totalErrors.details, (error) => {
                table.push([error.lines, colors.red('error'), error.message]);
                documentationLinks.add(`Visit ${error.docsLink} for ${error.path} documentation\n`);
            });
            err.message = `${colors.red('Yaml validation errors:\n')}`;
            err.message +=  `\n${table.toString()}\n`;

            err.summarize = colors.red(Validator._getSummarizeMessage());
        }
        err.documentationLinks = '';
        documentationLinks.forEach((documentationLink) => { err.documentationLinks += documentationLink; });

        throw err;
    }


    static _validateStepsLength(objectModel, yaml) {
        // get all step names:
        const stepNames = _.flatMap(objectModel.steps, (step, key) => {
            return step.steps ? Object.keys(step.steps) : [key];
        });
        const currentMaxStepLength = stepNames.reduce((acc, curr) => {
            if (curr.length > acc.length) {
                acc = {
                    length: curr.length,
                    name: curr
                };
            }
            return acc;
        }, {
            length: 0

        });
        if (currentMaxStepLength.length > MaxStepLength) {
            const message = `step name length is limited to ${MaxStepLength}`;
            const stepName = currentMaxStepLength.name;
            Validator._addError({
                message,
                name: 'ValidationError',
                details: [
                    {
                        message,
                        type: 'Validation',
                        path: 'steps',
                        context: {
                            key: 'steps',
                        },
                        level: 'step',
                        stepName,
                        docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/advanced-workflows/#parallel-pipeline-mode',
                        actionItems: `Please shoten name for ${stepName} steps`,
                        lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName }),
                    },
                ]
            });
        }
    }

    static _validateUniqueStepNames(objectModel, yaml) {
        // get all step names:
        const stepNames = _.flatMap(objectModel.steps, (step, key) => {
            return step.steps ? Object.keys(step.steps) : [key];
        });
        // get duplicate step names from step names:
        const duplicateSteps = _.filter(stepNames, (val, i, iteratee) => _.includes(iteratee, val, i + 1));
        if (duplicateSteps.length > 0) {
            _.forEach(duplicateSteps, (stepName) => {
                const message = `step name exist more than once`;
                const error = new Error(message);
                error.name = 'ValidationError';
                error.isJoi = true;
                error.details = [
                    {
                        message,
                        type: 'Validation',
                        path: 'steps',
                        context: {
                            key: 'steps',
                        },
                        level: 'step',
                        stepName,
                        docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/advanced-workflows/#parallel-pipeline-mode',
                        actionItems: `Please rename ${stepName} steps`,
                        lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName }),
                    },
                ];

                Validator._addError(error);
            });

        }
    }

    static _validateUniqueStepNamesOfChiledAndParent(objectModel, yaml) {
        // get a list of all steps names of each father step
        const stepsNames = _.map(objectModel.steps,
            (step, key) => {
                return step.steps ? Object.keys(step.steps).concat([key]) : [];
            });
        // get duplicate step names from steps names:
        const duplicateStepsList = _.map(stepsNames, step => _.filter(step, (val, i, iteratee) => _.includes(iteratee, val, i + 1)));

        _.forEach(duplicateStepsList, (arrStep) => {
            if (arrStep.length > 0) {
                _.forEach(arrStep, (stepName) => {
                    // eslint-disable-next-line max-len
                    const message = `step names should be unique within the same pipeline. The parent and child steps should NOT share the same name`;
                    const error = new Error(message);
                    error.name = 'ValidationError';
                    error.isJoi = true;
                    error.details = [
                        {
                            message,
                            type: 'Validation',
                            path: 'steps',
                            context: {
                                key: 'steps',
                            },
                            level: 'step',
                            stepName,
                            docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/advanced-workflows/#inserting-parallel-steps-in-a-sequential-pipeline',
                            actionItems: `Please rename ${arrStep} steps`,
                            lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName }),
                        },
                    ];

                    Validator._addError(error);

                });
            }
        });
    }

    static _validateRootSchema(objectModel, yaml) {
        const rootSchema = Joi.object({
            version: Joi.number().positive().required(),
            steps: Joi.object().pattern(/^.+$/, Joi.object()).required(),
            stages: Joi.array().items(Joi.string()),
            mode: Joi.string().valid('sequential', 'parallel'),
            hooks: BaseSchema._getBaseHooksSchema(),
            fail_fast: [Joi.object(), Joi.string(), Joi.boolean()],
            success_criteria: BaseSchema.getSuccessCriteriaSchema(),
            indicators: Joi.array(),
            services: Joi.object(),
            build_version: Joi.string().valid('v1', 'v2')
        });
        const validationResult = Joi.validate(objectModel, rootSchema, { abortEarly: false });
        if (validationResult.error) {
            _.forEach(validationResult.error.details, (err) => {
                Validator._processRootSchemaError(err, validationResult, yaml);
            });
        }
    }

    static _processRootSchemaError(err, validationResult, yaml) {
        // regex to split joi's error path so that we can use lodah's _.get
        // we make sure split first ${{}} annotations before splitting by dots (.)
        const joiPathSplitted = err.path
            .split(/(\$\{\{[^}]*}})|([^.]+)/g);

        // TODO: I (Itai) put this code because i could not find a good regex to do all the job
        const originalPath = [];
        _.forEach(joiPathSplitted, (keyPath) => {
            if (keyPath && keyPath !== '.') {
                originalPath.push(keyPath);
            }
        });

        const originalFieldValue = _.get(validationResult, ['value', ...originalPath]);
        const message = originalFieldValue ? `${err.message}. Current value: ${originalFieldValue} ` : err.message;
        const error = new Error();
        error.name = 'ValidationError';
        error.isJoi = true;
        error.details = [
            {
                message,
                type: 'Validation',
                path: 'workflow',
                context: {
                    key: 'workflow',
                },
                level: 'workflow',
                docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                actionItems: `Please make sure you have all the required fields`,
                lines: ErrorBuilder.getErrorLineNumber({ yaml, key: err.path }),
            },
        ];

        Validator._addError(error);
    }

    static _resolveStepsModules() {
        if (this.stepsModules) {
            return this.stepsModules;
        }

        const stepsPath = path.join(__dirname, 'steps');
        const allStepSchemaFiles = fs.readdirSync(stepsPath);
        const stepsModules = {};
        allStepSchemaFiles.forEach(((schemaFile) => {
            const StepModule = require(path.join(stepsPath, schemaFile)); // eslint-disable-line
            if (StepModule.getType()) {
                stepsModules[StepModule.getType()] = StepModule;
            }
        }));

        this.stepsModules = stepsModules;
        return this.stepsModules;
    }

    static _resolveStepsJoiSchemas(objectModel = {}, opts = {}) {
        const stepsModules = Validator._resolveStepsModules();
        const joiSchemas = {};
        _.forEach(stepsModules, (StepModule, stepType) => {
            joiSchemas[stepType] = new StepModule(objectModel).getSchema(opts[stepType]);
        });
        return joiSchemas;
    }

    static _validateStepSchema(objectModel, yaml, opts) {
        const stepsSchemas = Validator._resolveStepsJoiSchemas(objectModel, opts);
        const steps = {};
        _.map(objectModel.steps, (s, name) => {
            const step = _.cloneDeep(s);
            if (step.arguments) {
                Object.assign(step, step.arguments);
                delete step.arguments;
            }
            if (step.type === 'parallel') {
                if (_.size(step.steps) > 0) {
                    _.map(step.steps, (innerStep, innerName) => {
                        steps[innerName] = innerStep;
                    });
                    for (const stepName in step.steps) { // eslint-disable-line
                        const subStep = steps[stepName];
                        if (_.get(subStep, 'type', 'freestyle') === PendingApproval.getType()) {
                            const error = new Error(`"type" can't be ${PendingApproval.getType()}`);
                            error.name = 'ValidationError';
                            error.isJoi = true;
                            error.details = [
                                {
                                    message: `"type" can't be ${PendingApproval.getType()}`,
                                    type: 'Validation',
                                    path: 'type',
                                    context: {
                                        key: 'type',
                                    },
                                    level: 'step',
                                    stepName,
                                    docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/advanced-workflows/',
                                    actionItems: `Please change the type of the sub step`,
                                    lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName }),
                                },
                            ];
                            Validator._addError(error);
                        }
                    }
                } else {
                    const error = new Error('"steps" is required and must be an array steps');
                    error.name = 'ValidationError';
                    error.isJoi = true;
                    error.details = [
                        {
                            message: '"steps" is required and must be an array of type steps',
                            type: 'Validation',
                            path: 'steps',
                            context: {
                                key: 'steps',
                            },
                            level: 'workflow',
                            docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                            actionItems: `Please make sure you have all the required fields`,
                            lines: ErrorBuilder.getErrorLineNumber({ yaml }),
                        },
                    ];
                    Validator._addError(error);
                }
            } else {
                steps[name] = step;
            }
        });
        for (const stepName in steps) { // eslint-disable-line
            const step = steps[stepName];
            let { type } = step;
            if (!type) {
                type = 'freestyle';
            }
            const stepSchema = stepsSchemas[type];
            if (!stepSchema) {
                console.log(`Warning: no schema found for step type '${type}'. Skipping validation`);
                continue; // eslint-disable-line no-continue
            }

            const validationResult = Joi.validate(step, stepSchema, { abortEarly: false });
            if (validationResult.error) {
                _.forEach(validationResult.error.details, (err) => {
                    Validator._processStepSchemaError(err, validationResult, stepName, type, yaml, stepSchema);
                });
            }
        }
    }


    static _processStepSchemaError(err, validationResult, stepName, type, yaml, stepSchema) {
        const originalPath = Validator._getOriginalPath(err);
        const originalFieldValue = Validator._getOriginalFieldValue(originalPath, validationResult);
        const suggestion = Validator._getArgumentSuggestion(err, originalPath, stepSchema);
        const message = Validator._getStepSchemaErrorMessage(err, originalFieldValue, suggestion);
        const error = new Error();
        error.name = 'ValidationError';
        error.isJoi = true;
        const errorDetails = {
            message,
            type: 'Validation',
            path: 'steps',
            context: {
                key: 'steps',
            },
            level: 'step',
            stepName,
            docsLink: _.get(DocumentationLinks, `${type}`, docBaseUrl),
            actionItems: `Please make sure you have all the required fields and valid values`,
            lines: ErrorBuilder.getErrorLineNumber({ yaml, stepName, key: err.path }),
        };
        if (suggestion) {
            errorDetails.suggestion = {
                from: err.context.key,
                to: suggestion,
            };
        }

        error.details = [_.pickBy(errorDetails, _.identity)];

        Validator._addError(error);
    }


    static _getOriginalPath(err) {
        // regex to split joi's error path so that we can use lodah's _.get
        // we make sure split first ${{}} annotations before splitting by dots (.)
        const joiPathSplitted = err.path
            .split(/(\$\{\{[^}]*}})|([^.]+)/g);

        // TODO: I (Itai) put this code because i could not find a good regex to do all the job
        const originalPath = [];
        _.forEach(joiPathSplitted, (keyPath) => {
            if (keyPath && keyPath !== '.') {
                originalPath.push(keyPath);
            }
        });

        return originalPath;
    }


    static _getOriginalFieldValue(originalPath, validationResult) {
        return _.get(validationResult, ['value', ...originalPath]);
    }


    static _getArgumentSuggestion(err, originalPath, stepSchema) {
        const isNotAllowedArgumentError = _.includes(_.get(err, 'message'), 'is not allowed');
        const misspelledArgument = _.get(err, 'context.key', '');
        const suggestion = SuggestArgumentValidation.suggest(stepSchema, misspelledArgument, originalPath.slice(0, originalPath.length - 1));
        const canSuggest = !!(isNotAllowedArgumentError && misspelledArgument && stepSchema && suggestion);

        return canSuggest ? suggestion : null;
    }


    static _getStepSchemaErrorMessage(err, originalFieldValue, suggestion) {
        const isNotAllowedArgumentError = _.includes(_.get(err, 'message'), 'is not allowed');

        if (suggestion) {
            return `${err.message}. Did you mean "${suggestion}"?`;
        }

        if (originalFieldValue && !isNotAllowedArgumentError) {
            return `${err.message}. Current value: ${originalFieldValue} `;
        }

        return err.message;
    }

    static _validateContextStep(objectModel, yaml, context, opts) {
        const ignoreValidation = _.get(opts, 'ignoreValidation', false);
        _.forEach(objectModel.steps, (s, name) => {
            const step = _.cloneDeep(s);
            const stepType = _.get(step, 'type', 'freestyle');
            const validation = _.get(StepValidator, stepType);
            if (validation) {
                const { errors, warnings } = validation.validateStep(step, yaml, name, context, { ignoreValidation });
                errors.forEach(error => Validator._addError(error));
                warnings.forEach(warning => Validator._addWarning(warning));
            }
            if (step.type === 'parallel' || step.steps) {
                this._validateContextStep(step, yaml, context, opts);
            }

        });
    }

    static _validateIndention(yaml, outputFormat) {
        const yamlArray = yaml.split('\n');
        _.forEach(yamlArray, (line, number) => {
            if (line.match('(\\t+\\s+|\\s+\\t+)')) {
                const error = new Error('Mix of tabs and spaces');
                error.name = 'ValidationError';
                error.isJoi = true;
                error.details = [
                    {
                        message: 'Your YAML contains both spaces and tabs.',
                        type: ErrorType.Error,
                        path: 'indention',
                        code: 400,
                        context: {
                            key: 'indention',
                        },
                        level: 'workflow',
                        docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        lines: number,
                        actionItems: 'Please replace all tabs with spaces.'
                    },
                ];
                Validator._addError(error);
            }

        });
        if (_.size(totalErrors.details) > 0) {
            // throw error because when pipeline have a mix of tabs and spaces it not pass other validation
            Validator._throwValidationErrorAccordingToFormatWithWarnings(outputFormat);
        }
    }

    static _validateNewLineToSpaceConverter(yaml) {
        const yamlArray = yaml.split('\n');
        let validation = false;
        let prevSpaceCount = 0;
        for (const number in yamlArray) { // eslint-disable-line
            const line = yamlArray[number];
            if (line.includes('- >-')) {
                validation = true;
                const nextNumber = Number(number) + 1;
                if ((nextNumber) < (yamlArray.length - 1)) {
                    prevSpaceCount = yamlArray[nextNumber].search(/\S/);
                }
            } else if (validation) {
                const spaceCount = line.search(/\S/);
                if (line.includes('- ')
                    || (spaceCount < prevSpaceCount && line.match('^((?!-|\'|"|`).)*(([a-zA-Z/-\\\\]:\\s*[a-zA-Z-/-\\\\\'".]*))$'))) {
                    validation = false;
                } else if (spaceCount > prevSpaceCount) {
                    const error = new Error('Bad indention in commands step');
                    error.name = 'ValidationError';
                    error.isJoi = true;
                    error.details = [
                        {
                            message: `Your YAML contains invalid indentation after characters '>-'.`,
                            type: ErrorType.Warning,
                            path: 'indention',
                            code: 500,
                            context: {
                                key: 'indention',
                            },
                            level: 'workflow',
                            docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                            lines: Number(number) + 1,
                            actionItems: `Align the indent to the first line after characters '>-'.`
                        },
                    ];
                    Validator._addWarning(error);
                }
            }

        }
    }

    static _validateHooksSchema(objectModel, yaml, opts) {
        if (objectModel.hooks) {
            _.forEach(objectModel.hooks, (hook) => {
                const validationResult = Validator._validateSingleHookSchema(objectModel, hook, opts);
                if (validationResult.error) {
                    _.forEach(validationResult.error.details, (err) => {
                        Validator._processRootSchemaError(err, validationResult, yaml);
                    });
                }
            });
        }
        _.forEach(objectModel.steps, (step, stepName) => {
            if (step.hooks) {
                _.forEach(step.hooks, (hook) => {
                    const validationResult = Validator._validateSingleHookSchema(objectModel, hook, opts);
                    if (validationResult.error) {
                        _.forEach(validationResult.error.details, (err) => {
                            Validator._processStepSchemaError(err, validationResult, stepName, 'freestyle', yaml);
                        });
                    }
                });
                const validationResult = Validator._validateDisallowOldHooks(step);
                delete validationResult.value;
                if (validationResult.error) {
                    _.forEach(validationResult.error.details, (err) => {
                        Validator._processStepSchemaError(err, validationResult, stepName, 'freestyle', yaml);
                    });
                }
            }
        });
    }

    static _validateSingleHookSchema(objectModel, hook, opts) {
        if (_.isArray(hook)) {
            return {};
        }
        const stepsSchemas = Validator._resolveStepsJoiSchemas(objectModel, opts);
        const freestyleSchema = stepsSchemas.freestyle.keys({
            debug: Joi.forbidden(),
            on_start: Joi.forbidden(),
            on_finish: Joi.forbidden(),
            on_fail: Joi.forbidden(),
            hooks: Joi.forbidden(),
        });
        const multipleStepsSchema = Joi.object({
            mode: Joi.string().valid('sequential', 'parallel'),
            fail_fast: Joi.boolean(),
            steps: Joi.object().pattern(/.+/, freestyleSchema),
        });

        if (!hook.metadata && !hook.annotations && !hook.exec) {
            const schema = hook.steps ? multipleStepsSchema : freestyleSchema;
            return Joi.validate(hook, schema, { abortEarly: false });
        }

        let execSchema = Joi.alternatives([
            Joi.array().items(Joi.string()),
            Joi.object()
        ]);
        if (hook.exec) {
            if (_.isArray(hook.exec)) {
                execSchema = Joi.array().items(Joi.string());
            } else if (hook.exec.steps) {
                execSchema = multipleStepsSchema;
            } else {
                execSchema = freestyleSchema;
            }
        }

        const hookSchema = Joi.object({
            exec: execSchema,
            metadata: BaseSchema._getMetadataSchema(),
            annotations: BaseSchema._getAnnotationsSchema(),
        });
        return Joi.validate(hook, hookSchema, { abortEarly: false });
    }

    static _validateDisallowOldHooks(step) {
        const { hooks } = step;
        if (hooks && (hooks.on_success || hooks.on_finish || hooks.on_fail)) {
            const message = 'Either old "on_success/on_fail/on_finish" or new "hooks" should be used';
            const schema = Joi.object({
                on_success: Joi.forbidden().error(ErrorBuilder.buildJoiError({ message, path: 'on_success' })),
                on_finish: Joi.forbidden().error(ErrorBuilder.buildJoiError({ message, path: 'on_finish' })),
                on_fail: Joi.forbidden().error(ErrorBuilder.buildJoiError({ message, path: 'on_fail' })),
            }).unknown(true);
            return Joi.validate(step, schema, { abortEarly: false });
        }
        return {};
    }

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    /**
     * Validates a model of the deserialized YAML
     *
     * @param objectModel Deserialized YAML
     * @param outputFormat desire output format YAML
     * @throws An error containing the details of the validation failure
     */
    static validate(objectModel, outputFormat = 'message', yaml, opts) {
        totalErrors = {
            details: [],
        };
        Validator._validateUniqueStepNames(objectModel, yaml);
        Validator._validateUniqueStepNamesOfChiledAndParent(objectModel, yaml);
        Validator._validateStepsLength(objectModel, yaml);
        Validator._validateRootSchema(objectModel, yaml);
        Validator._validateStepSchema(objectModel, yaml, opts);
        Validator._validateHooksSchema(objectModel, yaml, opts);
        if (_.size(totalErrors.details) > 0) {
            Validator._throwValidationErrorAccordingToFormat(outputFormat);
        }
    }

    /**
     * Validates a model of the deserialized YAML
     *
     * @param objectModel Deserialized YAML
     * @param outputFormat desire output format YAML
     * @param yaml as string
     * @param context by account with git, clusters and registries
     * @throws An error containing the details of the validation failure
     */
    static validateWithContext(objectModel, outputFormat = 'message', yaml, context, opts) {
        totalErrors = {
            details: [],
        };
        totalWarnings = {
            details: [],
        };
        Validator._validateIndention(yaml, outputFormat);
        Validator._validateNewLineToSpaceConverter(yaml);
        Validator._validateUniqueStepNames(objectModel, yaml);
        Validator._validateUniqueStepNamesOfChiledAndParent(objectModel, yaml);
        Validator._validateStepsLength(objectModel, yaml);
        Validator._validateRootSchema(objectModel, yaml);
        Validator._validateStepSchema(objectModel, yaml, opts);
        Validator._validateHooksSchema(objectModel, yaml);
        Validator._validateContextStep(objectModel, yaml, context, opts);
        if (_.size(totalErrors.details) > 0 || _.size(totalWarnings.details) > 0) {
            Validator._throwValidationErrorAccordingToFormatWithWarnings(outputFormat);
        }
    }

    static getJsonSchemas() {
        if (this.jsonSchemas) {
            return this.jsonSchemas;
        }

        const stepsModules = Validator._resolveStepsModules();
        const jsonSchemas = {};
        _.forEach(stepsModules, (StepModule, stepType) => {
            jsonSchemas[stepType] = new StepModule({}).getJsonSchema();
        });
        this.jsonSchemas = jsonSchemas;
        return this.jsonSchemas;
    }
}

// Exported objects/methods
module.exports = Validator;
