/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions,no-template-curly-in-string */

'use strict';

const chai = require('chai');

const { expect }    = chai;
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

const Validator = require('../validator');

function validate(model) {
    return Validator(model);
}

function validateForError(model, expectedMessage, done) {
    try {
        validate(model);
        done(new Error('Validation should have failed'));
    } catch (e) {
        expect(e.message).to.match(new RegExp(`.*${expectedMessage}.*`));
        done();
    }
}

describe('Validate Codefresh YAML', () => {


    describe('Steps', () => {

        describe('Push-tag', () => {

            it('Invalid push-tag tags', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push_tag: {
                            title: 'Push tag',
                            type: 'push-tag',
                            image_name: 'codefresh/cf-docker-tag-pusher',
                            tags: [1, 2, 3]
                        }

                    }
                }, '"tags" at position 0 fails', done);
            });

            it('Invalid push-tag image-name', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push_tag: {
                            type: 'push-tag',
                            tags: ['1', '2', '3']
                        }

                    }
                }, '"image_name" is required', done);
            });


        });
    });
});
