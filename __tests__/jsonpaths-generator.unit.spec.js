/* eslint-env node, jest */

'use strict';

const { expect } = require('chai');

const { JSONPathsGenerator } = require('../schema/1.0/jsonpaths/jsonpaths-generator');
const Validator = require('../schema/1.0/validator');

describe('Validate jsonpaths-generator', () => {
    describe('generate JSON paths of booleans', () => {
        const fieldType = 'boolean';

        test('for the root of the pipeline yaml', async () => {
            const rootJoiSchema = Validator.getRootJoiSchema();
            const generator = new JSONPathsGenerator({ fieldType, joiSchema: rootJoiSchema });
            const JSONPaths = generator.getJSONPaths();

            const expectedJSONPaths = {
                'singleTypeFields': ['$.strict_fail_fast'],
                'multipleTypesFields': ['$.fail_fast'],
            };

            expect(JSONPaths).to.be.deep.equal(expectedJSONPaths);
        });

        test('for steps: composition, deploy, freestyle, helm, integration-test, launch-composition, parallel'
               + ', pending-approval, push, push-tag, simple_travis, travis', async () => {

            const stepNames = [
                'composition',
                'deploy',
                'freestyle',
                'helm',
                'integration-test',
                'launch-composition',
                'parallel',
                'pending-approval',
                'push',
                'push-tag',
                'simple_travis',
                'travis',
            ];

            const allStepsJoiSchemas = Validator.getStepsJoiSchemas();
            const neededStepsJoiSchemas = stepNames.reduce((acc, stepName) => {
                if (allStepsJoiSchemas[stepName]) {
                    acc[stepName] = allStepsJoiSchemas[stepName];
                }
                return acc;
            }, {});

            expect(Object.keys(neededStepsJoiSchemas)).to.be.deep.equal(stepNames);

            const stepsBooleanPaths = Object.entries(neededStepsJoiSchemas).reduce((acc, [stepName, stepSchema]) => {
                acc[stepName] = new JSONPathsGenerator({ fieldType, joiSchema: stepSchema }).getJSONPaths();
                return acc;
            }, {});

            const expectedValueForSingleStep = {
                'singleTypeFields': ['$.fail_fast', '$.strict_fail_fast'],
                'multipleTypesFields': []
            };

            Object.values(stepsBooleanPaths).forEach((booleanPaths) => {
                expect(booleanPaths).to.be.deep.equal(expectedValueForSingleStep);
            });
        });

        test('build step', async () => {

            const buildJoiSchema = Validator.getStepsJoiSchemas()?.build;

            // eslint-disable-next-line no-unused-expressions
            expect(buildJoiSchema).to.exist;

            const buildBooleanPaths = new JSONPathsGenerator({ fieldType, joiSchema: buildJoiSchema }).getJSONPaths();

            const expectedBuildBooleanPaths = {
                'singleTypeFields': [
                    '$.fail_fast',
                    '$.strict_fail_fast',
                    '$.no_cache',
                    '$.no_cf_cache',
                    '$.squash',
                    '$.buildkit',
                    '$.disable_push',
                    '$.cosign.sign'
                ],
                'multipleTypesFields': ['$.buildx']
            };

            expect(buildBooleanPaths).to.be.deep.equal(expectedBuildBooleanPaths);
        });

        test('git-clone step', async () => {

            const gitCloneJoiSchema = Validator.getStepsJoiSchemas()?.['git-clone'];

            // eslint-disable-next-line no-unused-expressions
            expect(gitCloneJoiSchema).to.exist;

            const gitCloneBooleanPaths = new JSONPathsGenerator({ fieldType, joiSchema: gitCloneJoiSchema }).getJSONPaths();

            const expectedGitCloneBooleanPaths = {
                'singleTypeFields': [
                    '$.fail_fast',
                    '$.strict_fail_fast',
                    '$.use_proxy',
                    '$.exclude_blobs'
                ],
                'multipleTypesFields': []
            };

            expect(gitCloneBooleanPaths).to.be.deep.equal(expectedGitCloneBooleanPaths);
        });

        test('for the root of the pipeline yaml in camelCase', async () => {
            const rootJoiSchema = Validator.getRootJoiSchema();
            const generator = new JSONPathsGenerator({
                fieldType,
                joiSchema: rootJoiSchema,
                convertToCamelCase: true
            });
            const JSONPaths = generator.getJSONPaths();

            const expectedJSONPaths = {
                'singleTypeFields': ['$.strictFailFast'],
                'multipleTypesFields': ['$.failFast'],
            };

            expect(JSONPaths).to.be.deep.equal(expectedJSONPaths);
        });

        test('build step in camelCase', async () => {
            const buildJoiSchema = Validator.getStepsJoiSchemas()?.build;

            // eslint-disable-next-line no-unused-expressions
            expect(buildJoiSchema).to.exist;

            const buildBooleanPaths = new JSONPathsGenerator({
                fieldType,
                joiSchema: buildJoiSchema,
                convertToCamelCase: true,
            }).getJSONPaths();

            const expectedBuildBooleanPaths = {
                'singleTypeFields': [
                    '$.failFast',
                    '$.strictFailFast',
                    '$.noCache',
                    '$.noCfCache',
                    '$.squash',
                    '$.buildkit',
                    '$.disablePush',
                    '$.cosign.sign',
                ],
                'multipleTypesFields': ['$.buildx']
            };

            expect(buildBooleanPaths).to.be.deep.equal(expectedBuildBooleanPaths);
        });
    });
});
