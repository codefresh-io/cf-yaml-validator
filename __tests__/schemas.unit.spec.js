// @ts-check
/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions,no-template-curly-in-string */

'use strict';

const chai = require('chai');
const BaseSchema = require('../schema/1.0/base-schema');

const { expect } = chai;

function expectValid(schema, value) {
    const result = schema.validate(value);
    expect(result.error).to.not.exist;
}

function expectInvalid(schema, value) {
    const result = schema.validate(value);
    expect(result.error).to.exist;
}

describe('schemas validation check', () => {
    describe('ssh param', () => {
        const schema = BaseSchema._getSshSchema();

        describe('valid', () => {
            it('should be valid when string "default"', () => {
                expectValid(schema, 'default');
            });
            it('should be valid when array of strings', () => {
                expectValid(schema, ['test_1', 'test_2']);
            });
            it('should be valid when object', () => {
                expectValid(schema, { test: 'test' });
            });
        });
        describe('invalid', () => {
            it('should be only string with value "default" when string passed', () => {
                expectInvalid(schema, 'asdf');
                expectInvalid(schema, 'test');
            });
            it('should be invalid when empty array ', () => {
                expectInvalid(schema, []);
            });
            it('should be invalid when empty object', () => {
                expectInvalid(schema, {});
            });
            it('should be only array of strings', () => {
                expectInvalid(schema, [1]);
                expectInvalid(schema, [true]);
                expectInvalid(schema, [{}]);
                expectInvalid(schema, [[]]);
            });
            it('should be only object of strings', () => {
                expectInvalid(schema, { test: 1 });
                expectInvalid(schema, { test: true });
                expectInvalid(schema, { test: [] });
                expectInvalid(schema, { test: {} });
            });
        });
    });

    describe('secrets param', () => {
        const schema = BaseSchema._getSecretsSchema();

        describe('valid', () => {
            it('should be valid when array of strings', () => {
                expectValid(schema, ['test_1', 'test_2']);
            });
            it('should be valid when array of objects with "id" and "src" keys', () => {
                expectValid(schema, [{
                    id: 'test',
                    src: 'test',
                }]);
            });
        });
        describe('invalid', () => {
            it('should be only array of string or objects', () => {
                expectInvalid(schema, [1]);
                expectInvalid(schema, [true]);
                expectInvalid(schema, [[]]);
            });

            it('should be invalid when empty array', () => {
                expectInvalid(schema, []);
            });

            it('should be invalid when objects do not have required fields', () => {
                expectInvalid(schema, [{ src: 'test' }]);
                expectInvalid(schema, [{ id: 'test' }]);
            });
        });
    });
});
