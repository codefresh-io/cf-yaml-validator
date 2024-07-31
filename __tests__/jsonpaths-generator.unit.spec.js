/* eslint-env node, jest */

'use strict';

const { JSONPathsGenerator } = require('../schema/1.0/jsonpaths/jsonpaths-generator');
const Validator = require('../schema/1.0/validator');

describe('Validate jsonpaths-generator', () => {
    describe('detect booleans', () => {
        const fieldType = 'boolean';

        test('in the root of the pipeline yaml', async () => {
            const joiSchema = Validator.getRootJoiSchema();
            const generator = new JSONPathsGenerator({ fieldType, joiSchema });
            const JSONPaths = generator.getJSONPaths();

            const expectedJSONPaths = {
                'singleTypeFields': ['$.strict_fail_fast'],
                'multipleTypesFields': ['$.fail_fast'],
            };

            expect(JSONPaths).toStrictEqual(expectedJSONPaths);
        });
    });
});
