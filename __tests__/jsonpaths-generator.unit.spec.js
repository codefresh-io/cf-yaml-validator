'use strict';

const fs = require('fs/promises');
const path = require('path');
const jsYaml = require('js-yaml');
const { JSONPathsGenerator } = require('../schema/1.0/jsonpaths/jsonpaths-generator');
const Validator = require('../schema/1.0/validator');

async function parseTestYaml(fileName) {
    const yamlPath = path.join(__dirname, 'test-yamls', fileName);
    const yaml = await fs.readFile(yamlPath, 'utf8');
    return jsYaml.load(yaml);
}

describe('Validate jsonpaths-generator', () => {
    describe('detect booleans', () => {
        const fieldType = 'boolean';

        test('in the root of the pipeline yaml', async () => {
            const yaml = await parseTestYaml('yaml-with-booleans-in-the-root.yml');
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
