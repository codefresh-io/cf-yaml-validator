/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions,no-template-curly-in-string */

'use strict';

const _ = require('lodash');
const chai = require('chai');
const fs = require('fs');
const path = require('path');

const { expect }    = chai;
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

const Validator = require('../validator');

function validate(model, outputFormat, yaml) {
    return Validator.validate(model, outputFormat, yaml);
}

function validateWithContext(model, outputFormat, yaml, context) {
    return Validator.validateWithContext(model, outputFormat, yaml, context);
}

function validateForErrorWithContext(model, expectedError, expectedWarning, done, outputFormat = 'message', yaml, context) {
    try {
        validateWithContext(model, outputFormat, yaml, context);
    } catch (e) {
        if (outputFormat === 'message') {
            expect(e.details).to.deep.equal(expectedError);
            expect(e.warningDetails).deep.equal(expectedWarning);
        }
        done();
    }
}

function validateForError(model, expectedMessage, done, outputFormat = 'message', yaml) {
    try {
        validate(model, outputFormat, yaml);
        done(new Error('Validation should have failed'));
    } catch (e) {
        if (outputFormat === 'message') {
            expect(e.message).to.match(new RegExp(`.*${expectedMessage}.*`));
        }
        if (outputFormat === 'printify' || outputFormat === 'lint') {
            expect(e.details[0].message).to.equal(expectedMessage.message);
            expect(e.details[0].type).to.equal(expectedMessage.type);
            expect(e.details[0].level).to.equal(expectedMessage.level);
            expect(e.details[0].stepName).to.equal(expectedMessage.stepName);
            expect(e.details[0].docsLink).to.equal(expectedMessage.docsLink);
            expect(e.details[0].actionItems).to.equal(expectedMessage.actionItems);
            expect(e.details[0].lines).to.equal(expectedMessage.lines);
        }
        done();
    }
}

describe('Validate Codefresh YAML', () => {

    describe('Root elements', () => {

        it('No version', (done) => {

            validateForError({
                steps: {
                    jim: {}
                }
            }, '"version" is required', done);
        });

        it('No steps', (done) => {

            validateForError({
                version: '1.0'
            }, '"steps" is required', done);
        });

        it('Unknown root element', (done) => {

            validateForError({
                version: '1.0',
                whatIsThisElement: '',
                steps: {
                    jim: {
                        image: 'bob'
                    }
                }
            }, '"whatIsThisElement" is not allowed', done);
        });

        it('Unknown version', (done) => {

            validateForError({
                version: '0.1',
                steps: {
                    jim: {
                        image: 'bob'
                    }
                }
            }, 'Current version: 0.1 is invalid. please change version to 1.0', done);
        });
    });

    describe('Steps', () => {

        describe('Common step attributes', () => {

            it('Unrecognized type', () => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: { type: 'invalid' }
                    }
                });
            });

            it('Working directory on a push step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'push',
                            'candidate': 'bob',
                            'working_directory': 'meow'
                        }
                    }
                }, '"working_directory" is not allowed', done);
            });

            it('Credentials on a build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'credentials': {
                                username: 'jim',
                                password: 'bob'
                            }
                        }
                    }
                }, '"credentials" is not allowed', done);
            });


            it('no_cache on a build step', () => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'no_cache': true
                        }
                    }
                });
            });

            it('no_cf_cache on a build step', () => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'no_cf_cache': true
                        }
                    }
                });
            });

            it('Non-bool no_cache on a build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'no_cache': 'please do sir'
                        }
                    }
                }, '"no_cache" must be a boolean', done);
            });

            it('Non-bool no_cache on a build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'no_cf_cache': 'please do sir'
                        }
                    }
                }, '"no_cf_cache" must be a boolean', done);
            });

            it('squash on a build step', () => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'squash': true
                        }
                    }
                });
            });

            it('Non-bool squash on a build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'squash': 'please do sir'
                        }
                    }
                }, '"squash" must be a boolean', done);
            });

            it('Empty credentials', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'git-clone',
                            repo: 'jim',
                            credentials: {}
                        }
                    }
                }, '"username" is required', done);
            });

            it('Non-string working directory', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'image': 'myimage',
                            'working_directory': {}
                        }
                    }
                }, '"working_directory" must be a string', done);
            });

            it('Non-string description', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'description': {}
                        }
                    }
                }, '"description" must be a string', done);
            });

            it('Non-string title', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'title': {}
                        }
                    }
                }, '"title" must be a string', done);
            });

            it('Non object docker_machine', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'docker_machine': 'google'
                        }
                    }
                }, '"docker_machine" must be an object', done);
            });

            it('Non-boolean fail-fast', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'fail_fast': {}
                        }
                    }
                }, '"fail_fast" must be a boolean', done);
            });

            it('Non-string tag', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'tag': []
                        }
                    }
                }, '"tag" must be a string', done);
            });

            it('Unknown post-step metadata operation', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                metadata: {
                                    put: [
                                        {
                                            '${{build_prj.image}}': [
                                                { 'qa': 'pending' }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }, '"put" is not allowed', done);
            });

            it('Unknown post-step metadata entry', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                metadata: {
                                    set: {
                                        '${{build_prj.image}}': [
                                            { 'qa': 'pending' }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }, '"set" must be an array', done);
            });

            it('Unspecified image to annotate', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                metadata: {
                                    set: [
                                        { 'qa': 'pending' }
                                    ]
                                }
                            }
                        }
                    }
                }, '"qa" must be an array', done);
            });

            it('Invalid post-step metadata annotation key', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                metadata: {
                                    set: [
                                        {
                                            '${{build_prj.image}}': [
                                                'an invalid key'
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }, '"an invalid key" fails to match', done);
            });

            it('Invalid post-step metadata annotation value', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                metadata: {
                                    set: [
                                        {
                                            '${{build_prj.image}}': [
                                                { 'key1': [] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }, '"key1" must be a', done);
            });

            it('Invalid post-step metadata annotation evaluation expression', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                metadata: {
                                    set: [
                                        {
                                            '${{build_prj.image}}': [
                                                {
                                                    'jimbob': {
                                                        eval: 'jimbob == jimbob'
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }, '"evaluate" is required', done);
            });

            it('Unknown post-step annotate operation', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                annotations: {
                                    put: [
                                        {
                                            entity_type: 'image',
                                            entity_id: '${{build_prj.image}}',
                                            annotations: [
                                                { 'qa': 'pending' }
                                            ],
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }, '"put" is not allowed', done);
            });

            it('Unknown build annotate operation', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        build: {
                            type: 'build',
                            image_name: 'name',
                            annotations: {
                                put: [
                                    {
                                        entity_type: 'image',
                                        entity_id: '${{build_prj.image}}',
                                        annotations: [
                                            { 'qa': 'pending' }
                                        ],
                                    }
                                ]
                            }
                        }
                    }
                }, '"put" is not allowed', done);
            });

            it('Unknown post-step annotation entry', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                annotations: {
                                    set: {
                                        entity_type: 'image',
                                        entity_id: '${{build_prj.image}}',
                                        annotations: [
                                            { 'qa': 'pending' }
                                        ],
                                    },
                                }
                            }
                        }
                    }
                }, '"set" must be an array', done);
            });

            it('Unknown post-step annotation entry', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                annotations: {
                                    unset: {
                                        entity_type: 'image',
                                        entity_id: '${{build_prj.image}}',
                                        annotations: [
                                            { 'qa': 'pending' }
                                        ],
                                    },
                                }
                            }
                        }
                    }
                }, '"unset" must be an array', done);
            });

            it('Unknown build annotation entry', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        build: {
                            type: 'build',
                            image_name: 'name',
                            annotations: {
                                set: {
                                    entity_type: 'image',
                                    entity_id: '${{build_prj.image}}',
                                    annotations: [
                                        { 'qa': 'pending' }
                                    ],
                                },
                            }
                        }
                    }
                }, '"set" must be an array', done);
            });

            it('Invalid post-step annotation key', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                annotations: {
                                    set: [{
                                        entity_type: 'image',
                                        entity_id: '${{build_prj.image}}',
                                        annotations: [
                                            { 'an invalid key': 'pending' }
                                        ],
                                    }]
                                }
                            }
                        }
                    }
                }, '"an invalid key" is not allowed', done);
            });

            it('Invalid post-step annotation key', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                annotations: {
                                    unset: [{
                                        entity_type: 'image',
                                        entity_id: '${{build_prj.image}}',
                                        annotations: ['an invalid key'],
                                    }]
                                }
                            }
                        }
                    }
                }, '"an invalid key" fails to match', done);
            });

            it('Invalid post-step metadata annotation value', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                annotations: {
                                    set: [{
                                        entity_type: 'image',
                                        entity_id: '${{build_prj.image}}',
                                        annotations: [
                                            { 'key': [] }
                                        ],
                                    }]
                                }
                            }
                        }
                    }
                }, '"key" must be a', done);
            });

            it('Invalid post-step annotation evaluation expression', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                annotations: {
                                    set: [{
                                        entity_type: 'image',
                                        entity_id: '${{build_prj.image}}',
                                        annotations: [{
                                            'key': {
                                                eval: 'jimbob == jimbob'
                                            }
                                        }],
                                    }]
                                }
                            }
                        }
                    }
                }, '"evaluate" is required', done);
            });
        });

        describe('Freestyle step attributes', () => {

            it('Non-string image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: { image: {} }
                    }
                }, '"image" must be a string', done);
            });

            it('Image on non-freestyle step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'image': 'bobson'
                        }
                    }
                }, '"image" is not allowed', done);
            });

            it('Non-array commands', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            commands: ''
                        }
                    }
                }, '"commands" must be an array', done);
            });

            it('Non-string commands', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            commands: [{}, 'asdasd']
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('Non-array environment', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            environment: ''
                        }
                    }
                }, '"environment" must be an array', done);
            });

            it('Non-string environment', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            environment: [{}, 'asdasd']
                        }
                    }
                }, '"0" must be a string', done);
            });


            it('Non-string or array entrypoint', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            entry_point: {}
                        }
                    }
                }, '"entry_point" must be a (string|array)', done);
            });

            it('Non-string or array cmd', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            cmd: {}
                        }
                    }
                }, '"cmd" must be a (string|array)', done);
            });

            it('cmd with commands', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            cmd: ['yo'],
                            commands: ['what']
                        }
                    }
                }, '"commands" conflict with forbidden peer "cmd"', done);
            });

            it('do not allow volume without :', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            commands: ['what'],
                            volumes: ['heyhey']
                        }
                    }
                }, 'fails to match the required pattern: /:/', done);
            });

            it('explicit shell should fail if passed a non recognized value', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            commands: ['what'],
                            shell: 'bashh'
                        }
                    }
                }, '["shell" must be one of [sh, bash]]', done);
            });

            it('should fail in case of passing shell without commands', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            image: 'bob',
                            cmd: 'commands',
                            shell: 'bash'
                        }
                    }
                }, '"shell" conflict with forbidden peer "cmd"', done);
            });
        });

        describe('Git clone step attributes', () => {

            it('Non-existing repo', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'git-clone',
                        }
                    }
                }, '"repo" is required', done);
            });

            it('Non-string repo', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'git-clone',
                            repo: []
                        }
                    }
                }, '"repo" must be a string', done);
            });

            it('Repo on non-git clone step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'repo': 'github.com/owner/repo'
                        }
                    }
                }, '"repo" is not allowed', done);
            });

            it('Non-string revision', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'git-clone',
                            repo: 'github.com/owner/repo',
                            revision: []
                        }
                    }
                }, '"revision" must be a string', done);
            });

            it('Revision on non-git clone step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jimb',
                            'revision': 'github.com/owner/repo'
                        }
                    }
                }, '"revision" is not allowed', done);
            });
        });

        describe('Build step attributes', () => {

            it('Non-existing image name', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'build',
                        }
                    }
                }, '"image_name" is required', done);
            });

            it('Non-string image name', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': []
                        }
                    }
                }, '"image_name" must be a string', done);
            });

            it('Image name on non-build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'git-clone',
                            'repo': 'jim',
                            'image_name': 'github.com/owner/repo'
                        }
                    }
                }, '"image_name" is not allowed', done);
            });

            it('Non-string Dockerfile', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'dockerfile': []
                        }
                    }
                }, '"dockerfile" must be a string', done);
            });

            it('Dockerfile on non-build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'git-clone',
                            'repo': 'jim',
                            'dockerfile': 'jim'
                        }
                    }
                }, '"dockerfile" is not allowed', done);
            });

            it('Non-array build arguments', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'build_arguments': ''
                        }
                    }
                }, '"build_arguments" must be an array', done);
            });

            it('Non-string build arguments', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'build_arguments': [{}, 'asdasd']
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('Unknown metadata operation', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'metadata': {
                                'unset': [{ qa: 'pending' }]
                            }
                        }
                    }
                }, '"unset" is not allowed', done);
            });

            it('Invalid character in metadata key', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'metadata': {
                                'set': [{ 'qa.bob': 'pending' }]
                            }
                        }
                    }
                }, '"qa.bob" is not allowed', done);
            });

            it('Unknown metadata value object', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'metadata': {
                                'set': [
                                    {
                                        'bob': {
                                            uneval: false
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }, '"evaluate" is required', done);
            });
        });

        describe('Push step attributes', () => {

            it('Non-existing candidate', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'push',
                        }
                    }
                }, '"candidate" is required', done);
            });

            it('Non-string candidate', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'push',
                            candidate: []
                        }
                    }
                }, '"candidate" must be a string', done);
            });

            it('Candidate on non-push step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'candidate': 'github.com/owner/repo'
                        }
                    }
                }, '"candidate" is not allowed', done);
            });

            it('Non-string registry', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'push',
                            candidate: 'imageId',
                            registry: []
                        }
                    }
                }, '"registry" must be a string', done);
            });

            it('Registry on non-push step', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'build',
                            'image_name': 'jim',
                            'candidate': 'wowwww'
                        }
                    }
                }, '"candidate" is not allowed', done);
            });

            it('ECR registry puss step', () => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'push',
                            'provider': 'ecr',
                            'candidate': 'wowwww',
                            'registry': 'reg',
                            'tag': 'tg',
                            'accessKeyId': 'kid',
                            'secretAccessKey': 'sac',
                            'region': 'rg'
                        }
                    }
                });
            });
        });

        describe('Composition step attributes', () => {
            it('No composition', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'composition',
                            'composition_variables': ['meow=wuff'],
                            'composition_candidates': {
                                jim: 'bob'
                            }
                        }
                    }
                }, '"composition" is required', done);
            });
            it('No composition candidates', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'composition',
                            'composition': {
                                jim: 'bob'
                            },
                            'composition_variables': ['']
                        }
                    }
                }, '"composition_candidates" is required', done);
            });

            it('Non-array composition variables', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'composition',
                            'composition': {},
                            'composition_candidates': {
                                jim: 'bob'
                            },
                            'composition_variables': ''
                        }
                    }
                }, '"composition_variables" must be an array', done);
            });

            it('Non-string composition variables', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'composition',
                            'composition': {},
                            'composition_candidates': {
                                jim: 'bob'
                            },
                            'composition_variables': [{}, '']
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('should fail when working_directory in composition_candidates ', (done) => {
                const yamlObj = {
                    'version': '1.0',
                    'steps': {
                        'my_sample_composition': {
                            'type': 'composition',
                            'title': 'Composition with volume',
                            'composition': {
                                'version': '2',
                                'services': {
                                    'my_service': {
                                        'image': 'alpine',
                                        'command': 'pwd',
                                        'working_directory': '/tmp'
                                    }
                                }
                            },
                            'composition_candidates': {
                                'my_unit_tests': {
                                    'image': 'alpine',
                                    'volumes': [
                                        'volume:volume'
                                    ],
                                    'working_directory': '/',
                                    'command': 'ls'
                                }
                            },
                            'add_flow_volume_to_composition': true
                        }
                    }
                };
                const yaml = `version: '1.0'
                                steps:
                                  my_sample_composition:
                                    type: composition
                                    title: Composition with volume
                                    composition:
                                      version: '2'
                                      services:
                                        my_service:
                                          image: alpine
                                          command: 'pwd'
                                          working_dir: /tmp
                                    composition_candidates:
                                      my_unit_tests:
                                        image: alpine1
                                        volumes:
                                          - 'volume:volume'
                                        working_director: '/'
                                        command: ls
                                    add_flow_volume_to_composition: true`;
                try {
                    validate(yamlObj, 'message', yaml);
                    done('should fail because of working_directory');
                } catch (e) {
                    done();
                }
            });
        });

        describe('travis step attributes', () => {

            it('No services', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                        }
                    }
                }, '"services" is required', done);
            });

            it('No test', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'services': {
                                redis: {
                                    image: 'redis',
                                },
                            }
                        }
                    }
                }, '"test" is required', done);
            });

            it('Bad service', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: 'hi there',
                            }
                        }
                    }
                }, '"redis" must be an object', done);
            });

            it('Service with no image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    ports: [3306]
                                },
                            }
                        }
                    }
                }, '"image" is required', done);
            });

            it('Service with bad ports #1', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: '3306'
                                },
                            }
                        }
                    }
                }, '"ports" must be an array', done);
            });

            it('Service with bad ports #2', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: 3306
                                },
                            }
                        }
                    }
                }, '"ports" must be an array', done);
            });

            it('Service with bad environment #1', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: 'hi'
                                },
                            }
                        }
                    }
                }, '"environment" must be an array', done);
            });

            it('Service with bad environment #2', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: 1234
                                },
                            }
                        }
                    }
                }, '"environment" must be an array', done);
            });

            it('Service with bad environment #3', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: [
                                        'hi there'
                                    ]
                                },
                            }
                        }
                    }
                }, 'value "hi there" fails to match the required pattern', done);
            });

            it('Service with bad environment #4', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: {
                                        hi: 123,
                                    }
                                },
                            }
                        }
                    }
                }, '"environment" must be an array', done);
            });

            it('Service with bad environment #5', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: [{
                                        someValue: '123'
                                    }
                                    ]
                                },
                            }
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('Service with bad environment #6', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: [{
                                        someValue: [123]
                                    }
                                    ]
                                },
                            }
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('Service with environment as array of strings', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: [
                                        'TEST=hello',
                                        'GOODBYE=you'
                                    ]
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('Service with environment as object', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('Service with empty environment', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: []
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('Service with empty ports', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('Service with empty image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: '',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"image" is not allowed to be empty', done);
            });

            it('Test with empty image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: '',
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"image" is not allowed to be empty', done);
            });

            it('Test with no image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                command: 'command'
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"image" is required', done);
            });


            it('Test with empty command', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: ''
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"command" is not allowed to be empty', done);
            });

            it('Test with no command', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"command" is required', done);
            });

            it('Test with working_directory', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'travis',
                            'test': {
                                image: 'bob',
                                command: 'command',
                                working_directory: '/var/whatever'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [
                                        6379
                                    ],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                });
                done();

            });


        });

        describe('simple_travis step attributes', () => {

            it('No services', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'simple_travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                        }
                    }
                }, '"services" is required', done);
            });

            it('No test', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'simple_travis',
                            'services': [
                                'redis'
                            ]
                        }
                    }
                }, '"test" is required', done);
            });

            it('Bad services', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'simple_travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': 'asd'

                        }
                    }
                }, '"services" must be an array', done);
            });

            it('Bad services #2', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'simple_travis',
                            'test': {
                                image: 'bob',
                                command: 'command'
                            },
                            'services': [123, 456, 0.9, true]
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('Unknown services', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'simple_travis',
                            'test': {
                                image: 'bob',
                                command: 'command',
                                working_directory: '/asdasd/asd'
                            },
                            'services': ['sqlserver', 'sqlite3']
                        }
                    }
                }, '"0" must be one of \\[mysql, postgresql, mariadb, mongodb', done);
            });

            it('Known services', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'simple_travis',
                            'test': {
                                image: 'bob',
                                command: 'command',
                                working_directory: '/asdasd/asd'
                            },
                            'services': [
                                'mysql',
                                'postgresql',
                                'mariadb',
                                'mongodb',
                                'couchdb',
                                'rabbitmq',
                                // 'riak',
                                'memcached',
                                'cassandra',
                                'neo4j',
                                'elasticsearch',
                                'rethinkdb',
                            ]
                        }
                    }
                });
                done();

            });

        });

        describe('integration-test step attributes', () => {

            it('No services', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                        }
                    }
                });
                done();
            });

            it('No test', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'services': {
                                redis: {
                                    image: 'redis',
                                },
                            }
                        }
                    }
                }, '"test" is required', done);
            });

            it('Bad services', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: 'hi there',
                            }
                        }
                    }
                }, '"redis" must be an object', done);
            });

            it('services with no image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    ports: [3306]
                                },
                            }
                        }
                    }
                }, '"image" is required', done);
            });

            it('services with bad ports #1', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: '3306'
                                },
                            }
                        }
                    }
                }, '"ports" must be an array', done);
            });

            it('services with bad ports #2', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: 3306
                                },
                            }
                        }
                    }
                }, '"ports" must be an array', done);
            });

            it('services with bad environment #1', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: 'hi'
                                },
                            }
                        }
                    }
                }, '"environment" must be an array', done);
            });

            it('services with bad environment #2', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: 1234
                                },
                            }
                        }
                    }
                }, '"environment" must be an array', done);
            });

            it('services with bad environment #3', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: [
                                        'hi there'
                                    ]
                                },
                            }
                        }
                    }
                }, 'value "hi there" fails to match the required pattern', done);
            });

            it('services with bad environment #4', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: {
                                        hi: 123,
                                    }
                                },
                            }
                        }
                    }
                }, '"environment" must be an array', done);
            });

            it('services with bad environment #5', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: [{
                                        someValue: '123'
                                    }
                                    ]
                                },
                            }
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('services with bad environment #6', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: [{
                                        someValue: [123]
                                    }
                                    ]
                                },
                            }
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('services with environment as array of strings', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: [
                                        'TEST=hello',
                                        'GOODBYE=you'
                                    ]
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('services with environment as object', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('services with empty environment', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [1234, 5678],
                                    environment: []
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('services with empty ports', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('services with empty image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: '',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"image" is not allowed to be empty', done);
            });

            it('Test with empty image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: '',
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"image" is not allowed to be empty', done);
            });

            it('Test with no image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                commands:
                                  ['command']
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"image" is required', done);
            });

            it('Test with empty commands array', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands: []
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"commands" does not contain 1 required value', done);
            });

            it('Test with empty commands', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands: ['   ', '']
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, 'is not allowed to be empty', done);
            });

            it('Test with no command', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                            },
                            'services': {
                                redis: {
                                    image: 'test',
                                    ports: [1234, 5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                                mysql: {
                                    image: 'mysql',
                                    ports: [5678],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                }, '"commands" is required', done);
            });

            it('Test with working_directory', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command'],
                                working_directory: '/var/whatever'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [
                                        6379
                                    ],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            }
                        }
                    }
                });
                done();

            });

            it('Test with preconfigured_services, services and lotsa stuff', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command'],
                                working_directory: '/var/whatever'
                            },
                            'services': {
                                redis: {
                                    image: 'redis',
                                    ports: [
                                        6379
                                    ],
                                    environment: {
                                        TEST: 'hello',
                                        GOODBYE: 'you',
                                    }
                                },
                            },
                            'preconfigured_services': ['mysql', 'neo4j', 'redis', 'cassandra']
                        }
                    }
                });
                done();

            });

            it('No preconfigured_services nor services', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                        }
                    }
                });
                done();
            });

            it('No test', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'preconfigured_services': [
                                'redis'
                            ]
                        }
                    }
                }, '"test" is required', done);
            });

            it('Bad preconfigured_services', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'preconfigured_services': 'asd'

                        }
                    }
                }, '"preconfigured_services" must be an array', done);
            });

            it('Bad preconfigured_services #2', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command']
                            },
                            'preconfigured_services': [123, 456, 0.9, true]
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('Unknown preconfigured_services', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command'],
                                working_directory: '/asdasd/asd'
                            },
                            'preconfigured_services': ['sqlserver', 'sqlite3']
                        }
                    }
                }, '"0" must be one of \\[mysql, postgresql, mariadb, mongodb', done);
            });

            it('Known preconfigured_services', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        jim: {
                            'type': 'integration-test',
                            'test': {
                                image: 'bob',
                                commands:
                                  ['command'],
                                working_directory: '/asdasd/asd'
                            },
                            'preconfigured_services': [
                                'mysql',
                                'postgresql',
                                'mariadb',
                                'mongodb',
                                'couchdb',
                                'rabbitmq',
                                // 'riak',
                                'memcached',
                                'cassandra',
                                'neo4j',
                                'elasticsearch',
                                'rethinkdb',
                            ]
                        }
                    }
                });
                done();

            });


        });

        describe('Parallel step attributes', () => {

            it('steps missing', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'parallel',
                            name: 'hey'
                        }
                    }
                }, '"steps" is required', done);
            });

            it('sub step is missing image', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'parallel',
                            name: 'hey',
                            steps: {
                                jimmy: {

                                }
                            }
                        }
                    }
                }, '"image" is required', done);
            });

            it('sub step can not be pending-approval', (done) => {

                validateForError({
                    version: '1.0',
                    steps: {
                        jim: {
                            type: 'parallel',
                            steps: {
                                pending: {
                                    type: 'pending-approval'
                                }
                            }
                        }
                    }
                }, '"type" can\\\'t be pending-approval', done);
            });

            it('allow pending-step in case it is not in the parallel step', (done) => {
                validate({
                    'version': '1.0',
                    'steps': {
                        'pending_step': {
                            'type': 'pending-approval',
                        },
                        'parallel_step': {
                            'type': 'parallel',
                            'steps': {
                                'step1': {
                                    'image': 'alpine',
                                    'commands': [
                                        'env'
                                    ]
                                }
                            }
                        }
                    }
                });
                done();
            });


            it('not-duplicate-step-names', (done) => {
                validate({
                    'version': '1.0',
                    'steps': {
                        'BuildingDockerImage': {
                            'type': 'parallel',
                            'steps': {
                                'writing_file_1': {
                                    'title': 'Step1A',
                                    'image': 'alpine',
                                    'commands': [
                                        'echo "Step1A" > first.txt'
                                    ]
                                },
                                'writing_file_2': {
                                    'title': 'Step1B',
                                    'image': 'alpine',
                                    'commands': [
                                        'echo "Step1B" > second.txt'
                                    ]
                                }
                            }
                        },
                        'BuildingDockerImage2': {
                            'type': 'parallel',
                            'steps': {
                                'writing_file_4': {
                                    'title': 'Step1A',
                                    'image': 'alpine',
                                    'commands': [
                                        'echo "Step1A" > first.txt'
                                    ]
                                },
                                'writing_file_3': {
                                    'title': 'Step1B',
                                    'image': 'alpine',
                                    'commands': [
                                        'echo "Step1B" > second.txt'
                                    ]
                                }
                            }
                        }
                    }
                });
                done();
            });

            it('duplicate-step-names', (done) => {
                validateForError({
                    'version': '1.0',
                    'steps': {
                        'BuildingDockerImage': {
                            'type': 'parallel',
                            'steps': {
                                'writing_file_1': {
                                    'title': 'Step1A',
                                    'image': 'alpine',
                                    'commands': [
                                        'echo "Step1A" > first.txt'
                                    ]
                                },
                                'writing_file_2': {
                                    'title': 'Step1B',
                                    'image': 'alpine',
                                    'commands': [
                                        'echo "Step1B" > second.txt'
                                    ]
                                }
                            }
                        },
                        'BuildingDockerImage2': {
                            'type': 'parallel',
                            'steps': {
                                'writing_file_1': {
                                    'title': 'Step1A',
                                    'image': 'alpine',
                                    'commands': [
                                        'echo "Step1A" > first.txt'
                                    ]
                                },
                                'writing_file_2': {
                                    'title': 'Step1B',
                                    'image': 'alpine',
                                    'commands': [
                                        'echo "Step1B" > second.txt'
                                    ]
                                }
                            }
                        }
                    }
                }, 'step name exist more than once\nstep name exist more than once\n', done);
            });
            it('long-step-names', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        // eslint-disable-next-line max-len
                        long123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890: {
                            image: 'bob',
                            commands: []
                        }
                    }
                }, 'step name length is limited to 150', done);
            });
        });

        describe('Pending-approval step attributes', () => {
            it('general', (done) => {

                validate({
                    version: '1.0',
                    steps: {
                        pending: {
                            type: 'pending-approval',
                        }
                    }
                });
                done();
            });
        });
    });

    describe('Complete descriptor', () => {
        it('Minimal', (done) => {
            validate({
                version: '1.0',
                steps: {
                    free: {
                        image: 'image/id',
                    },
                    clone: {
                        type: 'git-clone',
                        repo: 'github.com/owner/repo'
                    },
                    build: {
                        'type': 'build',
                        'image_name': 'teh-image'
                    },
                    push: {
                        type: 'push',
                        candidate: 'teh-image'
                    },
                    composition: {
                        'type': 'composition',
                        'composition': {},
                        'composition_candidates': {
                            jim: {
                                image: 'alpine'
                            }
                        }
                    },
                    string_composition: {
                        'type': 'composition',
                        'composition': 'path/to/composition',
                        'composition_candidates': {
                            jim: {
                                image: 'alpine'
                            }
                        }
                    },
                    composition_launch: {
                        type: 'launch-composition',
                        composition: {}
                    },
                    string_composition_launch: {
                        type: 'launch-composition',
                        composition: 'path/to/composition'
                    }
                }
            });
            done();
        });
        it('Full old compatibility format', (done) => {
            validate({
                version: '1.0',
                steps: {
                    free: {
                        'description': 'desc',
                        'image': 'image/id',
                        'working-directory': 'working/dir',
                        'commands': ['jim', 'bob'],
                        'environment': ['key=value', 'key1=value¡'],
                        'fail-fast': true,
                        'when': { branch: { only: ['master'] } }
                    },
                    clone: {
                        'type': 'git-clone',
                        'description': 'desc',
                        'working-directory': 'working/dir',
                        'repo': 'github.com/owner/repo',
                        'revision': 'abcdef12345',
                        'credentials': {
                            username: 'subject',
                            password: 'credentials'
                        },
                        'fail-fast': true,
                        'when': { branch: { ignore: ['develop'] } }
                    },
                    build: {
                        'type': 'build',
                        'description': 'desc',
                        'working-directory': 'working/dir',
                        'dockerfile': 'path/to/dockerfile',
                        'image-name': 'teh-image',
                        'tag': 'develop',
                        'build-arguments': ['jim=bob'],
                        'fail-fast': true,
                        'when': { condition: { all: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } }
                    },
                    push: {
                        'type': 'push',
                        'description': 'desc',
                        'candidate': 'teh-image',
                        'tag': 'develop',
                        'registry': 'dtr.host.com',
                        'credentials': {
                            username: 'subject',
                            password: 'credentials'
                        },
                        'fail-fast': true,
                        'when': { branch: { only: ['/FB-/i'] } }
                    },
                    composition: {
                        'type': 'composition',
                        'description': 'desc',
                        'working-directory': 'working/dir',
                        'composition': {
                            version: '2',
                            services: { db: { image: 'postgres' } }
                        },
                        'composition-candidates': {
                            'test-service': {
                                image: '${{from-step}}',
                                command: 'gulp lint'
                            }
                        },
                        'composition-variables': ['jim=bob'],
                        'fail-fast': true,
                        'when': { condition: { any: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } }
                    }
                }
            });
            done();
        });

        it('Full new format', (done) => {
            validate({
                version: '1.0',
                steps: {
                    free: {
                        'description': 'desc',
                        'title': 'Freestyle step',
                        'image': 'image/id',
                        'working_directory': 'working/dir',
                        'commands': ['jim', 'bob'],
                        'environment': ['key=value', 'key1=value¡'],
                        'fail_fast': true,
                        'when': { branch: { only: ['master'] } },
                        'on_success': {
                            metadata: {
                                set: [
                                    {
                                        '${{build_prj.image}}': [
                                            { 'qa': 'pending' },
                                            { 'healthy': true },
                                            { 'quality': 67 },
                                            { 'is_tested': { evaluate: '${{unit_test_step.status}} === success' } },
                                            'dangling'
                                        ]
                                    }
                                ]
                            }
                        },
                        'docker_machine': {
                            create: {
                                provider: 'google'
                            }
                        }
                    },
                    clone: {
                        'type': 'git-clone',
                        'description': 'desc',
                        'title': 'Git clone step',
                        'working_directory': 'working/dir',
                        'repo': 'github.com/owner/repo',
                        'revision': 'abcdef12345',
                        'credentials': {
                            username: 'subject',
                            password: 'credentials'
                        },
                        'fail_fast': true,
                        'when': { branch: { ignore: ['develop'] } },
                        'on_fail': {
                            metadata: {
                                set: [
                                    {
                                        '${{build_prj.image}}': [
                                            { 'qa': 'pending' },
                                            { 'healthy': true },
                                            { 'quality': 67 },
                                            { 'is_tested': { evaluate: '${{unit_test_step.status}} === success' } },
                                            'dangling'
                                        ]
                                    }
                                ]
                            }
                        },
                        'docker_machine': {
                            use: {
                                node: 'my-node-id-1'
                            }
                        }
                    },
                    build_string_dockerfile: {
                        'type': 'build',
                        'description': 'desc',
                        'title': 'Build step',
                        'working_directory': 'working/dir',
                        'dockerfile': 'path/to/dockerfile',
                        'no_cache': false,
                        'no_cf_cache': true,
                        'image_name': 'teh-image',
                        'tag': 'develop',
                        'target': 'stage1',
                        'build_arguments': ['jim=bob'],
                        'fail_fast': true,
                        'when': { condition: { all: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } },
                        'docker_machine': {
                            create: {
                                provider: 'google'
                            }
                        }
                    },
                    build_object_dockerfile: {
                        'type': 'build',
                        'description': 'desc',
                        'title': 'Build step',
                        'working_directory': 'working/dir',
                        'dockerfile': { content: 'jimson' },
                        'no_cache': false,
                        'no_cf_cache': true,
                        'image_name': 'teh-image',
                        'tag': 'develop',
                        'target': 'stage1',
                        'build_arguments': ['jim=bob'],
                        'fail_fast': true,
                        'when': { condition: { all: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } },
                        'metadata': {
                            'set': [
                                { 'qa': 'pending' },
                                { 'healthy': true },
                                { 'quality': 67 },
                                { 'is_tested': { evaluate: '${{unit_test_step.status}} === success' } },
                                'dangling'
                            ]
                        },
                        'docker_machine': {
                            use: {
                                node: 'my-node-id-1'
                            }
                        }
                    },
                    push: {
                        'type': 'push',
                        'description': 'desc',
                        'title': 'Push step',
                        'candidate': 'teh-image',
                        'tag': 'develop',
                        'registry': 'dtr.host.com',
                        'credentials': {
                            username: 'subject',
                            password: 'credentials'
                        },
                        'fail_fast': true,
                        'when': { branch: { only: ['/FB-/i'] } },
                        'on_finish': {
                            metadata: {
                                set: [
                                    {
                                        '${{build_prj.image}}': [
                                            { 'qa': 'pending' },
                                            { 'healthy': true },
                                            { 'quality': 67 },
                                            { 'is_tested': { evaluate: '${{unit_test_step.status}} === success' } },
                                            'dangling'
                                        ]
                                    }
                                ]
                            }
                        },
                        'docker_machine': {
                            create: {
                                provider: 'google'
                            }
                        }
                    },

                    composition: {
                        'type': 'composition',
                        'description': 'desc',
                        'title': 'Composition step',
                        'working_directory': 'working/dir',
                        'composition': {
                            version: '2',
                            services: { db: { image: 'postgres' } }
                        },
                        'composition_candidates': {
                            'test-service': {
                                image: '${{from-step}}',
                                command: 'gulp lint'
                            }
                        },
                        'composition_variables': ['jim=bob'],
                        'fail_fast': true,
                        'when': { condition: { any: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } },
                        'on_success': {
                            metadata: {
                                set: [
                                    {
                                        '${{build_prj.image}}': [
                                            { 'qa': 'pending' },
                                            { 'healthy': true },
                                            { 'quality': 67 },
                                            { 'is_tested': { evaluate: '${{unit_test_step.status}} === success' } },
                                            'dangling'
                                        ]
                                    }
                                ]
                            }
                        },
                        'docker_machine': {
                            create: {
                                provider: 'amazon'
                            }
                        }
                    }
                }
            });
            done();
        });

        it('Use internal schema properties', (done) => {
            validate({
                version: '1.0',
                steps: {
                    free: {
                        'description': 'desc',
                        'title': 'Freestyle step',
                        'image': 'image/id',
                        'working_directory': 'working/dir',
                        'commands': ['jim', 'bob'],
                        'environment': ['key=value', 'key1=value¡'],
                        'fail_fast': true,
                        'when': { branch: { only: ['master'] } },
                        'create_file': 'yes'
                    },
                    composition: {
                        'type': 'composition',
                        'description': 'desc',
                        'title': 'Composition step',
                        'working_directory': 'working/dir',
                        'composition': {
                            version: '2',
                            services: { db: { image: 'postgres' } }
                        },
                        'composition_candidates': {
                            'test-service': {
                                image: '${{from-step}}',
                                command: 'gulp lint'
                            }
                        },
                        'composition_variables': ['jim=bob'],
                        'fail_fast': true,
                        'when': { condition: { any: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } },
                        'add_flow_volume_to_composition': true,
                        'environment_name': 'moo',
                        'entry_point': 'jim',
                        'assets': 'bob',
                        'create_file': 'yes'
                    },
                    composition_launch: {
                        'type': 'launch-composition',
                        'description': 'desc',
                        'title': 'Composition step',
                        'working_directory': 'working/dir',
                        'composition': {
                            version: '2',
                            services: { db: { image: 'postgres' } }
                        },
                        'composition_variables': ['jim=bob'],
                        'fail_fast': true,
                        'when': { condition: { any: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } },
                        'add_flow_volume_to_composition': true,
                        'environment_name': 'moo',
                        'entry_point': 'jim',
                        'assets': 'bob',
                        'create_file': 'yes'
                    }
                }
            });
            done();
        });

        describe('include When in step', () => {
            describe('steps', () => {

                describe('positive', () => {

                    it('allow as array', (done) => {
                        validate({
                            version: '1.0',
                            steps: {
                                free: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                    'when': {
                                        steps: [
                                            {
                                                name: 'step_name',
                                            }
                                        ]
                                    },
                                },
                            }
                        });
                        done();
                    });

                    it('allow as object', (done) => {
                        validate({
                            version: '1.0',
                            steps: {
                                free: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                    'when': {
                                        steps: {
                                            all: [
                                                {
                                                    name: 'step_name',
                                                    on: [
                                                        'success'
                                                    ]
                                                }
                                            ],
                                        }
                                    },
                                },
                            }
                        });
                        done();
                    });

                });

                describe('negative', () => {
                    it('array not empty', (done) => {
                        validateForError({
                            version: '1.0',
                            steps: {
                                free: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                    'when': {
                                        steps: []
                                    },
                                },
                            }
                        }, '"steps" must contain at least 1 items', done);
                    });

                    it('dont include "all" and "any" together', (done) => {
                        validateForError({
                            version: '1.0',
                            steps: {
                                free: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                    'when': {
                                        steps: {
                                            all: [{
                                                name: 'name'
                                            }],
                                            any: [{
                                                name: 'name'
                                            }]
                                        }
                                    },
                                },
                            }
                        }, 'contains a conflict between exclusive peers', done);
                    });
                });
            });
        });

        describe('success criteria', () => {

            describe('for workflow', () => {

                describe('positive', () => {

                    it('allow only steps', (done) => {
                        validate({
                            version: '1.0',
                            success_criteria: {
                                steps: {
                                    ignore: [
                                        'step'
                                    ]
                                }
                            },
                            steps: {
                                free_1: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                },
                                free_2: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                },
                            }
                        });
                        done();

                    });

                    it('allow to ignore steps', (done) => {
                        validate({
                            version: '1.0',
                            success_criteria: {
                                steps: {
                                    only: [
                                        'step'
                                    ]
                                }
                            },
                            steps: {
                                free_1: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                },
                                free_2: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                },
                            }
                        });
                        done();

                    });

                    it('allow only and ignore steps', (done) => {
                        validate({
                            version: '1.0',
                            success_criteria: {
                                steps: {
                                    only: [
                                        'step'
                                    ],
                                    ignore: [
                                        'step'
                                    ]
                                }
                            },
                            steps: {
                                free_1: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                },
                                free_2: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                },
                            }
                        });
                        done();
                    });

                    it('allow only and ignore steps', (done) => {
                        validate({
                            version: '1.0',
                            success_criteria: {
                                steps: {
                                    only: [
                                        'step'
                                    ],
                                    ignore: [
                                        'step'
                                    ]
                                }
                            },
                            steps: {
                                free_1: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                },
                                free_2: {
                                    'title': 'Freestyle step',
                                    'image': 'image/id',
                                    'commands': ['jim', 'bob'],
                                },
                            }
                        });
                        done();
                    });

                });

            });

        });

        describe('Retry', () => {
            it('No retry is valid', (done) => {
                validate({
                    version: '1.0',
                    steps: {
                        free_1: {
                            'title': 'Freestyle step',
                            'image': 'image/id',
                            'commands': ['env'],
                        },
                    }
                });
                done();
            });

            it('Retry with exponential factor must be positive number non zero', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        free_1: {
                            'title': 'Freestyle step',
                            'image': 'image/id',
                            'commands': ['env'],
                            'retry': {
                                exponentialFactor: ''
                            }
                        },
                    }
                }, '"exponentialFactor" must be a number', done);
            });

            it('Retry max attempts must be positive number non zero', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        free_1: {
                            'title': 'Freestyle step',
                            'image': 'image/id',
                            'commands': ['env'],
                            'retry': {
                                maxAttempts: ''
                            }
                        },
                    }
                }, '"maxAttempts" must be a number', done);
            });

            it('Retry delay must be positive number non zero', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        free_1: {
                            'title': 'Freestyle step',
                            'image': 'image/id',
                            'commands': ['env'],
                            'retry': {
                                delay: ''
                            }
                        },
                    }
                }, '"delay" must be a number', done);
            });
        });
    });

    describe('Print original value on error', () => {

        describe('Print original value', () => {

            it('errored field is on the root', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 2
                        }
                    }
                }, 'value: 2', done);
            });

            it('error field is inside a double annotated variable', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {
                        push: {
                            'type': 'push',
                            'candidate': 'teh-image',
                            'on_finish': {
                                metadata: {
                                    set: [
                                        {
                                            '${{build_prj.image}}': [
                                                'an invalid key'
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }, 'value: an invalid key', done);
            });
        });


    });


    describe('Printify mode', () => {

        it('validate all the required fields', (done) => {
            validateForError({
                version: '1.0',
                steps: {
                    push: {
                        'typea': 'push',
                        'candidate': 'candidate',
                    },
                },
            }, {
                message: '"image" is required',
                type: 'Validation',
                level: 'step',
                stepName: 'push',
                docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/steps/freestyle/',
                actionItems: `Please make sure you have all the required fields and valid values`,
            }, done, 'printify');
        });

    });

    describe('lint mode', () => {

        it('validate all the required fields', (done) => {
            validateForError({
                versionx: '1.0',
                steps: {
                    push: {
                        'type': 'push',
                        'candidate': 'candidate',
                    },
                },
            }, {
                message: '"version" is required',
                type: 'Validation',
                level: 'workflow',
                docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                actionItems: `Please make sure you have all the required fields`,
                lines: 0,
            }, done, 'lint', 'versionx: 1.0 \n steps \n push \n typea: push \n candidate: candidate');
        });

        it('validate lint in case we don`t have step name and key', (done) => {
            validateForError({
                versionx: '1.0',
            }, {
                message: '"version" is required',
                type: 'Validation',
                level: 'workflow',
                docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                actionItems: `Please make sure you have all the required fields`,
                lines: 0,
            }, done, 'lint', 'versionx: 1.0');
        });

    });

    describe('get json schema', () => {

        it('should return json schemas', () => {
            const schemas = Validator.getJsonSchemas();
            expect(_.size(schemas)).to.equal(12);
        });

    });
});

describe('Validate Codefresh YAML with context', () => {
    const currentPath = './__tests__/';
    it('validate yaml with template', async (done) => {
        const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-template.yml'), 'utf8');
        const model = {
            version: '1.0',
            steps: {
                main_clone: {
                    type: 'git-clone',
                    description: 'Cloning main repository...',
                    repo: 'codefresh/test',
                    revision: '${{CF_BRANCH}}',
                    git: '${{github}}'
                },
                push: {
                    title: 'Pushing image to cfcr',
                    type: 'push',
                    image_name: 'codefresh/test',
                    registry: '${{cfcr}}',
                    candidate: '${{build}}',
                    tags: [
                        '${{CF_BRANCH_TAG_NORMALIZED}}',
                        '${{CF_REVISION}}']
                },
                deploy: {
                    title: 'deploying to cluster',
                    type: 'deploy',
                    kind: 'kubernetes',
                    service: 'kubernetes',
                    cluster: '${{test-cluster}}',
                    namespace: 'default',
                    arguments: {
                        image: '${{build}}',
                        registry: 'cfcr',
                        commands:
                            ['cf-deploy-kubernetes deployment.yml']
                    }
                }
            }
        };
        const expectedMessage = [];
        const expectedWarning = [
            {
                'actionItems': undefined,
                'code': 101,
                'context': {
                    'key': 'git'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/variables/',
                'level': 'workflow',
                'lines': 8,
                'message': 'Your Git Integration uses a variable that is not configured and will fail without defining it.',
                'path': 'git',
                'stepName': 'main_clone',
                'type': 'Warning'
            },
            {
                'actionItems': undefined,
                'code': 201,
                'context': {
                    'key': 'registry'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/variables/',
                'level': 'workflow',
                'lines': 13,
                'message': 'Your Registry Integration uses a variable that is not configured and will fail without defining it.',
                'path': 'registry',
                'stepName': 'push',
                'type': 'Warning'
            },
            {
                'actionItems': undefined,
                'code': 301,
                'context': {
                    'key': 'cluster'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/variables/',
                'level': 'workflow',
                'lines': 23,
                'message': 'Your Cluster Integration uses a variable that is not configured and will fail without defining it.',
                'path': 'cluster',
                'stepName': 'deploy',
                'type': 'Warning'
            }
        ];
        const context = {
            git: [{ metadata: { name: 'git' } }], registries: [{ name: 'reg' }], clusters: [{ selector: 'cluster' }], variables: []
        };
        validateForErrorWithContext(model, expectedMessage, expectedWarning, done, 'message', yaml, context);
    });

    it('validate yaml when integrations not found', async (done) => {
        const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/default-yaml.yml'), 'utf8');
        const model = {
            version: '1.0',
            steps: {
                main_clone: {
                    type: 'git-clone',
                    description: 'Cloning main repository...',
                    repo: 'codefresh/test',
                    revision: '${{CF_BRANCH}}',
                    git: 'github'
                },
                push: {
                    title: 'Pushing image to cfcr',
                    type: 'push',
                    image_name: 'codefresh/test',
                    registry: 'cfcr',
                    candidate: '${{build}}',
                    tags: [
                        '${{CF_BRANCH_TAG_NORMALIZED}}',
                        '${{CF_REVISION}}']
                },
                deploy: {
                    title: 'deploying to cluster',
                    type: 'deploy',
                    kind: 'kubernetes',
                    service: 'kubernetes',
                    cluster: 'test-cluster',
                    namespace: 'default',
                    arguments: {
                        image: '${{build}}',
                        registry: 'cfcr',
                        commands:
                            ['cf-deploy-kubernetes deployment.yml']
                    }
                }
            }
        };
        const expectedMessage = [
            {
                'actionItems': 'Add Git.',
                'code': 100,
                'context': {
                    'key': 'git'
                },
                'docsLink': 'https://codefresh.io/docs/docs/integrations/git-providers/',
                'level': 'workflow',
                'lines': 3,
                'message': 'You have not added your Git integration.',
                'path': 'git',
                'stepName': 'main_clone',
                'type': 'Error'
            },
            {
                'actionItems': 'Add Registry registry.',
                'code': 200,
                'context': {
                    'key': 'registry'
                },
                'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                'level': 'workflow',
                'lines': 9,
                'message': 'You have not added your Registry integration.',
                'path': 'registry',
                'stepName': 'push',
                'type': 'Error'
            },
            {
                'actionItems': 'Add Cluster.',
                'code': 300,
                'context': {
                    'key': 'cluster'
                },
                'docsLink': 'https://codefresh.io/docs/docs/deploy-to-kubernetes/add-kubernetes-cluster/',
                'level': 'workflow',
                'lines': 18,
                'message': 'You have not added your Cluster integration.',
                'path': 'cluster',
                'stepName': 'deploy',
                'type': 'Error'
            }
        ];
        const expectedWarning = [];
        const context = {
            git: [], registries: [], clusters: [], variables: []
        };
        validateForErrorWithContext(model, expectedMessage, expectedWarning, done, 'message', yaml, context);
    });


    it('validate yaml when integrations is empty', async (done) => {
        const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-empty-integration.yml'), 'utf8');
        const model = {
            version: '1.0',
            steps: {
                main_clone: {
                    type: 'git-clone',
                    description: 'Cloning main repository...',
                    repo: 'codefresh/test',
                    revision: '${{CF_BRANCH}}'
                },
                push: {
                    title: 'Pushing image to cfcr',
                    type: 'push',
                    image_name: 'codefresh/test',
                    candidate: '${{build}}',
                    tags: [
                        '${{CF_BRANCH_TAG_NORMALIZED}}',
                        '${{CF_REVISION}}']
                },
                deploy: {
                    title: 'deploying to cluster',
                    type: 'deploy',
                    kind: 'kubernetes',
                    service: 'kubernetes',
                    namespace: 'default',
                    arguments: {
                        image: '${{build}}',
                        registry: 'cfcr',
                        commands:
                            ['cf-deploy-kubernetes deployment.yml']
                    }
                }
            }
        };
        const expectedMessage = [
            {
                'actionItems': 'Please make sure you have all the required fields and valid values',
                'context': {
                    'key': 'steps'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/deploy/',
                'level': 'step',
                'lines': 16,
                'message': '"cluster" is required',
                'path': 'steps',
                'stepName': 'deploy',
                'type': 'Validation'
            }
        ];
        const expectedWarning = [
            {
                'actionItems': 'You have additional integrations configured which can be used if defined explicitly.',
                'code': 103,
                'context': {
                    'key': 'git'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/git-clone/',
                'level': 'workflow',
                'lines': 3,
                'message': 'You are using your default Git Integration \'git2\'.',
                'stepName': 'main_clone',
                'path': 'git',
                'type': 'Warning'
            },
            {
                'actionItems': 'You have additional integrations configured which can be used if defined explicitly.',
                'code': 203,
                'context': {
                    'key': 'registry'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/push/',
                'level': 'workflow',
                'lines': 8,
                'message': 'You are using your default Registry Integration \'reg2\'.',
                'stepName': 'push',
                'path': 'registry',
                'type': 'Warning'
            },
            {
                'actionItems': 'You have additional integrations configured which can be used if defined explicitly.',
                'code': 303,
                'context': {
                    'key': 'cluster'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/deploy/',
                'level': 'workflow',
                'lines': 16,
                'message': 'You are using your default Cluster Integration.',
                'stepName': 'deploy',
                'path': 'cluster',
                'type': 'Warning'
            }
        ];
        const context = {
            git: [
                { metadata: { name: 'git' } },
                { metadata: { name: 'git2', default: true } }
            ],
            registries: [
                { name: 'reg' }, { name: 'reg2', default: true }
            ],
            clusters: [
                { selector: 'cluster' }, { selector: 'cluster2' }
            ],
            variables: []
        };
        validateForErrorWithContext(model, expectedMessage, expectedWarning, done, 'message', yaml, context);
    });


    it('validate yaml when integrations not found', async (done) => {
        const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/mixed-yaml.yml'), 'utf8');
        const model = {
            version: '1.0',
            steps: {
                main_clone: {
                    type: 'git-clone',
                    description: 'Cloning main repository...',
                    repo: 'codefresh/test',
                    revision: '${{CF_BRANCH}}'
                },
                push: {
                    title: 'Pushing image to cfcr',
                    type: 'push',
                    image_name: 'codefresh/test',
                    candidate: '${{build}}',
                    tags: [
                        '${{CF_BRANCH_TAG_NORMALIZED}}',
                        '${{CF_REVISION}}']
                },
                deploy: {
                    title: 'deploying to cluster',
                    type: 'deploy',
                    kind: 'kubernetes',
                    service: 'kubernetes',
                    namespace: 'default',
                    arguments: {
                        image: '${{build}}',
                        registry: 'cfcr',
                        commands:
                            ['cf-deploy-kubernetes deployment.yml']
                    }
                }
            }
        };
        const expectedMessage = [
            {
                'actionItems': 'Please remove all tabs with spaces.',
                'code': 400,
                'context': {
                    'key': 'indention'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                'level': 'workflow',
                'lines': 3,
                'message': 'Your YAML contains both spaces and tabs.',
                'path': 'indention',
                'type': 'Error'
            },
            {
                'actionItems': 'Please remove all tabs with spaces.',
                'code': 400,
                'context': {
                    'key': 'indention'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                'level': 'workflow',
                'lines': 4,
                'message': 'Your YAML contains both spaces and tabs.',
                'path': 'indention',
                'type': 'Error'
            },
            {
                'actionItems': 'Please remove all tabs with spaces.',
                'code': 400,
                'context': {
                    'key': 'indention'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                'level': 'workflow',
                'lines': 5,
                'message': 'Your YAML contains both spaces and tabs.',
                'path': 'indention',
                'type': 'Error'
            },
            {
                'actionItems': 'Please remove all tabs with spaces.',
                'code': 400,
                'context': {
                    'key': 'indention'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                'level': 'workflow',
                'lines': 6,
                'message': 'Your YAML contains both spaces and tabs.',
                'path': 'indention',
                'type': 'Error'
            },
            {
                'actionItems': 'Please remove all tabs with spaces.',
                'code': 400,
                'context': {
                    'key': 'indention'
                },
                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                'level': 'workflow',
                'lines': 7,
                'message': 'Your YAML contains both spaces and tabs.',
                'path': 'indention',
                'type': 'Error'
            }
        ];
        const expectedWarning = [];
        const context = {
            git: [
                { metadata: { name: 'git' } },
                { metadata: { name: 'git2' } }
            ],
            registries: [
                { name: 'reg' }, { name: 'reg2' }
            ],
            clusters: [
                { selector: 'cluster' }, { selector: 'cluster2' }
            ],
            variables: []
        };
        validateForErrorWithContext(model, expectedMessage, expectedWarning, done, 'message', yaml, context);
    });


});
