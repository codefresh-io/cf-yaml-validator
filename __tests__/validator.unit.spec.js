/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions,no-template-curly-in-string */

'use strict';

const _ = require('lodash');
const chai = require('chai');
const fs = require('fs');
const jsyaml = require('js-yaml');
const path = require('path');
const colors = require('colors');

const { expect } = chai;
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

const Mustache = require('mustache');
const Validator = require('../validator');
const { isWebUri } = require('../schema/1.0/validations/registry');


const yamlTemplateForDuplicateStepNamesTest = JSON.stringify({
    'version': '1.0',
    'steps': {
        '{{stepName0}}': {
            'type': 'parallel',
            'steps': {
                '{{stepName0_1}}': {
                    'title': 'Step1A',
                    'image': 'alpine',
                    'commands': [
                        'echo "Step1A" > first.txt'
                    ]
                },
                '{{stepName0_2}}': {
                    'title': 'Step1B',
                    'image': 'alpine',
                    'commands': [
                        'echo "Step1B" > second.txt'
                    ]
                }
            }
        },
        '{{stepName1}}': {
            'type': 'parallel',
            'steps': {
                '{{stepName1_1}}': {
                    'title': 'Step1A',
                    'image': 'alpine',
                    'commands': [
                        'echo "Step1A" > first.txt'
                    ]
                },
                '{{stepName1_2}}': {
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
const yamlTemplateForNestedDuplicateStepNamesTest = JSON.stringify({
    'version': '1.0',
    'steps': {
        '{{stepName0}}': {
            'type': 'parallel',
            'steps': {
                '{{stepName0_1}}': {
                    'title': 'Step1A',
                    'image': 'alpine',
                    'commands': [
                        'echo "Step1A" > first.txt'
                    ]
                },
                '{{stepName0_2}}': {
                    'title': 'Step1B',
                    'image': 'alpine',
                    'commands': [
                        'echo "Step1B" > second.txt'
                    ]
                },
                '{{stepName0_3}}': {
                    'type': 'parallel',
                    'steps': {
                        '{{stepName0_3_1}}': {
                            'title': 'Step1A',
                            'image': 'alpine',
                            'commands': [
                                'echo "Step1A" > first.txt'
                            ]
                        }
                    }
                }
            }
        },
        '{{stepName1}}': {
            'type': 'parallel',
            'steps': {
                '{{stepName1_1}}': {
                    'title': 'Step1A',
                    'image': 'alpine',
                    'commands': [
                        'echo "Step1A" > first.txt'
                    ]
                },
                '{{stepName1_2}}': {
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

function validate(model, outputFormat, yaml) {
    return Validator.validate(model, outputFormat, yaml);
}

function validateWithContext(model, outputFormat, yaml, context, opts) {
    return Validator.validateWithContext(model, outputFormat, yaml, context, opts);
}

function validateForErrorWithContext(model, expectedError, done, outputFormat = 'message', yaml, context, opts) {
    try {
        validateWithContext(model, outputFormat, yaml, context, opts);
        done(new Error('should have failed'));
    } catch (e) {
        if (outputFormat === 'message') {
            expect(e.details).to.deep.equal(expectedError.details);
            expect(e.warningDetails).deep.equal(expectedError.warningDetails);
        }
        if (outputFormat === 'lint') {
            expect(e.message).to.deep.equal(expectedError.message);
            expect(e.warningMessage).deep.equal(expectedError.warningMessage);
            expect(e.summarize).deep.equal(expectedError.summarize);
            expect(e.documentationLinks).deep.equal(expectedError.documentationLinks);
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

const currentPath = './__tests__/';

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

        it('incorrect build_version', (done) => {

            validateForError({
                version: '1.0',
                build_version: 'v3',
                steps: {}
            }, '"build_version" must be one of', done);
        });

        it('valid build_version', (done) => {

            validate({
                version: '1.0',
                build_version: 'v2',
                steps: {}
            });
            done();
        });

        describe('Hooks', () => {
            it('valid hooks', (done) => {
                validate({
                    version: '1.0',
                    steps: {},
                    hooks: {
                        on_elected: ['echo test'],
                        on_success: {
                            exec: ['echo test'],
                        },
                        on_finish: {
                            image: 'alpine',
                            commands: ['echo test'],
                        },
                        on_fail: {
                            exec: {
                                image: 'alpine',
                                commands: ['echo test'],
                            },
                            metadata: {
                                set: [
                                    {
                                        test: [
                                            {
                                                test: 'test'
                                            }
                                        ]
                                    }
                                ]
                            },
                            annotations: {
                                set: [
                                    {
                                        entity_type: 'build',
                                        annotations: [{ test: 'test' }]
                                    }
                                ],
                                unset: [
                                    {
                                        entity_type: 'build',
                                        annotations: ['test']
                                    }
                                ]
                            }
                        }
                    }
                });
                done();
            });
            it('valid pipeline hooks with plugins / costume steps', (done) => {
                validate({
                    version: '1.0',
                    steps: {},
                    hooks: {
                        on_elected: ['echo test'],
                        on_finish: {
                            steps: {
                                freestyle: {
                                    title: 'some title',
                                    type: 'freestyle',
                                    arguments: {
                                        image: 'ubuntu:latest',
                                        commands: ['echo test']
                                    },
                                },
                                clone: {
                                    title: 'clone title',
                                    type: 'git-clone',
                                    repo: 'codefresh/repo'
                                },
                            },
                        },
                        on_success: {
                            steps: {
                                deploy: {
                                    type: 'helm',
                                    arguments: {
                                        chart_name: 'test_chart',
                                        release_name: 'first',
                                        kube_context: 'my-kubernetes-context',
                                        tiller_namespace: 'kube-system',
                                        namespace: 'project',
                                        custom_values: [
                                            'KEY1=VAL1',
                                            'KEY2=VAL2',
                                            'KEY3=VAL3',
                                        ],
                                        custom_value_files: [
                                            '/path/to/values.yaml',
                                            '/path/to/values2.yaml'
                                        ],
                                        cmd_ps: '--wait --timeout 5'
                                    }
                                }
                            }
                        },
                        on_fail: {
                            steps: {
                                exec: {
                                    image: 'alpine',
                                    commands: ['echo test'],
                                },
                                clone: {
                                    title: 'clone title',
                                    type: 'git-clone',
                                    repo: 'codefresh/repo'
                                },
                                build: {
                                    title: 'Building Docker image',
                                    type: 'build',
                                    image_name: 'user/sandbox',
                                    working_directory: '${{clone}}',
                                    tag: '${{CF_BRANCH_TAG_NORMALIZED}}',
                                    dockerfile: 'Dockerfile',
                                }
                            },
                        }
                    }
                });
                done();
            });
            it('valid pipeline hooks that contain only metadata/annotations', (done) => {
                validate({
                    version: '1.0',
                    steps: {},
                    hooks: {
                        on_success: {
                            metadata: {
                                set: [{
                                    '${{steps.build.imageId}}': [{
                                        'CF_QUALITY': true,
                                        'COMMIT_HASH': '${{CF_SHORT_REVISION}}',
                                        'COMMIT_URL': '${{CF_COMMIT_URL}}',
                                        'DD_VERSION': '${{CF_SHORT_REVISION}}',
                                    }]
                                }]
                            }
                        },
                        on_fail: {
                            annotations: {
                                set: [
                                    {
                                        entity_type: 'build',
                                        annotations: [{ test: 'test' }]
                                    }
                                ],
                                unset: [
                                    {
                                        entity_type: 'build',
                                        annotations: ['test']
                                    }
                                ]
                            }
                        },
                    },
                });
                done();
            });
            it('invalid hooks', (done) => {
                validateForError({
                    version: '1.0',
                    steps: {},
                    hooks: {
                        on_elected: ['echo test'],
                        on_success: {
                            exec: ['echo test'],
                        },
                        on_finish: {
                            image: 'alpine',
                            commands: ['echo test'],
                        },
                        on_fail: {
                            exec: {
                                image: 'alpine',
                                commands: ['echo test'],
                            },
                            metadata: {
                                set: [
                                    {
                                        test: [
                                            {
                                                test: 'test'
                                            }
                                        ]
                                    }
                                ]
                            },
                            annotations: {
                                set: [
                                    {
                                        entity_type: 'build',
                                        annotations: [{ test: 'test' }]
                                    }
                                ],
                                unset: [
                                    {
                                        entity_type: 'build',
                                        annotations: ['test']
                                    }
                                ]
                            }
                        },
                        on_something: {
                            image: 'alpine'
                        }
                    }
                }, '"on_something" is not allowed', done);
            });
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jim',
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
                            image_name: 'owner/name',
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
                            image_name: 'owner/name',
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

            describe('timeout', () => {
                describe('not defined', () => {
                    it('should pass if timeout was not defined', () => {
                        validate({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image' } },
                        });
                    });

                    it.each([
                        null,
                        undefined,
                    ])('should pass if timeout is %s', (timeout) => {
                        validate({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image', timeout } },
                        });
                    });
                });

                describe('defined', () => {
                    const units = ['s', 'm', 'h'];
                    const getRandomUnit = () => {
                        return units[Math.floor(Math.random() * units.length)];
                    };
                    const getRandomInt = () => Math.floor(Math.random() * 1000);
                    const getRandomFloat = () => Math.random() * 1000;
                    const getInvalidUnit = () => {
                        const char = String.fromCharCode(Math.floor(Math.random() * 65535));
                        return units.includes(char) ? getInvalidUnit() : char;
                    };


                    const validIntegerTimeouts = [`0${getRandomUnit()}`];
                    for (let i = 0; i < 50; i += 1) {
                        validIntegerTimeouts.push(`${getRandomInt()}${getRandomUnit()}`);
                    }
                    it.each(validIntegerTimeouts)('should pass if timeout is valid: %s', (timeout) => {
                        validate({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image', timeout } },
                        });
                    });

                    const validFloatTimeouts = [`0.0${getRandomUnit()}`];
                    for (let i = 0; i < 50; i += 1) {
                        validFloatTimeouts.push(`${getRandomFloat()}${getRandomUnit()}`);
                    }
                    it.each(validFloatTimeouts)('should pass if timeout is valid: %s', (timeout) => {
                        validate({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image', timeout } },
                        });
                    });

                    const numbers = [0];
                    for (let i = 0; i < 50; i += 1) {
                        numbers.push(i % 2 ? getRandomInt() : getRandomFloat());
                    }
                    it.each(numbers)('should not pass if timeout is number: %s', (timeout, done) => {
                        validateForError({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image', timeout } },
                        }, `"timeout" must be a string`, done);
                    });

                    it.each([
                        0,
                        false,
                        true,
                        {},
                        [],
                    ])(`should not pass if timeout is invalid data type: %s`, (timeout, done) => {
                        validateForError({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image', timeout } },
                        }, `"timeout" must be a string`, done);
                    });

                    it('should not pass if timeout is an empty string', (done) => {
                        validateForError({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image', timeout: '' } },
                        }, `"timeout" is not allowed to be empty`, done);
                    });

                    const invalidUnits = [];
                    for (let i = 0; i < 50; i += 1) {
                        invalidUnits.push(`${getRandomInt()}${getInvalidUnit()}`);
                    }
                    it.each(invalidUnits)('should not pass if timeout unit is invalid: %s', (timeout, done) => {
                        validateForError({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image', timeout } },
                        }, `fails to match the "\\<duration\\>\\<units\\> where duration is int\\|float and units are s\\|m\\|h" pattern`, done);
                    });

                    it.each([
                        `.5${getRandomUnit()}`,
                        `1.${getRandomUnit()}`,
                        `1.5.1${getRandomUnit()}`,
                        `1,5${getRandomUnit()}`,
                    ])('should not pass if timeout duration is invalid: %s', (timeout, done) => {
                        validateForError({
                            version: '1.0',
                            steps: { mock: { image: 'mock-image', timeout } },
                        }, `fails to match the "\\<duration\\>\\<units\\> where duration is int\\|float and units are s\\|m\\|h" pattern`, done);
                    });
                });
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
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
                            'image_name': 'owner/jimb',
                            'revision': 'github.com/owner/repo'
                        }
                    }
                }, '"revision" is not allowed', done);
            });
        });

        describe('Build step attributes', () => {

            describe('negative', () => {

                it('registry is not supported in case image version is not V2', (done) => {

                    validateForError({
                        version: '1.0',
                        steps: {
                            jim: {
                                'type': 'build',
                                'image_name': 'owner/jim',
                                'registry': 'reg'
                            }
                        }
                    }, '"registry" is not allowed', done);
                });

                it('disable_push is not supported in case image version is not V2', (done) => {

                    validateForError({
                        version: '1.0',
                        steps: {
                            jim: {
                                'type': 'build',
                                'image_name': 'owner/jim',
                                'disable_push': true
                            }
                        }
                    }, '"disable_push" is not allowed', done);
                });

                it('tags is not supported in case image version is not V2', (done) => {

                    validateForError({
                        version: '1.0',
                        steps: {
                            jim: {
                                'type': 'build',
                                'image_name': 'owner/jim',
                                'tags': [
                                    'tag1',
                                    'tag2'
                                ]
                            }
                        }
                    }, '"tags" is not allowed', done);
                });

                it('registry must be a string', (done) => {

                    const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-v2-failure.yml'), 'utf8');
                    const model = {
                        version: '1.0',
                        steps: {
                            BuildingDockerImage: {
                                title: 'Building Docker Image',
                                type: 'build',
                                image_name: 'codefresh/itai-15',
                                working_directory: './',
                                tag: 'master',
                                dockerfile: {
                                    content: 'From alpine:latest'
                                },
                                registry: 1,
                                disable_push: 'hello',
                                tags: [
                                    1,
                                    2
                                ]
                            }
                        }
                    };
                    const expectedMessage = {
                        details: [
                            {
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'context': {
                                    'key': 'steps'
                                },
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'level': 'step',
                                'lines': 3,
                                'message': '"0" must be a string. Current value: 1 ',
                                'path': 'steps',
                                'stepName': 'BuildingDockerImage',
                                'type': 'Validation'
                            },
                            {
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'context': {
                                    'key': 'steps'
                                },
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'level': 'step',
                                'lines': 3,
                                'message': '"1" must be a string. Current value: 2 ',
                                'path': 'steps',
                                'stepName': 'BuildingDockerImage',
                                'type': 'Validation'
                            },
                            {
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'context': {
                                    'key': 'steps'
                                },
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'level': 'step',
                                'lines': 12,
                                'message': '"registry" must be a string. Current value: 1 ',
                                'path': 'steps',
                                'stepName': 'BuildingDockerImage',
                                'type': 'Validation'
                            },
                            {
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'context': {
                                    'key': 'steps'
                                },
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'level': 'step',
                                'lines': 13,
                                'message': '"disable_push" must be a boolean. Current value: hello ',
                                'path': 'steps',
                                'stepName': 'BuildingDockerImage',
                                'type': 'Validation'
                            }
                        ],
                        warningDetails: []
                    };
                    const context = {
                        git: [
                            { metadata: { name: 'git' } },
                            { metadata: { name: 'git2', default: true } }
                        ],
                        registries: [
                            { name: 'reg' }, { name: 'reg2', default: false }
                        ],
                        clusters: [
                            { selector: 'cluster' }, { selector: 'cluster2' }
                        ],
                        variables: [],
                        autoPush: true
                    };
                    const opts = {
                        build: {
                            buildVersion: 'V2'
                        }
                    };
                    validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, opts);
                });

            });

            describe('positive', () => {
                it('registry must be a string', (done) => {

                    const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-v2-success.yml'), 'utf8');
                    const model = {
                        version: '1.0',
                        steps: {
                            BuildingDockerImage: {
                                title: 'Building Docker Image',
                                type: 'build',
                                image_name: 'codefresh/itai-15',
                                working_directory: './',
                                dockerfile: {
                                    content: 'From alpine:latest'
                                },
                                registry: 'reg',
                                disable_push: true,
                                tags: [
                                    'tag1',
                                    'tag2'
                                ]
                            }
                        }
                    };

                    const context = {
                        git: [
                            { metadata: { name: 'git' } },
                            { metadata: { name: 'git2', default: true } }
                        ],
                        registries: [
                            { name: 'reg' }, { name: 'reg2', default: false }
                        ],
                        clusters: [
                            { selector: 'cluster' }, { selector: 'cluster2' }
                        ],
                        variables: [],
                        autoPush: true
                    };
                    const opts = {
                        build: {
                            buildVersion: 'V2'
                        }
                    };
                    validateWithContext(model, 'message', yaml, context, opts);
                    done();
                });
            });

            describe('cache_from', () => {
                it('positive', (done) => {
                    const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-v2-success.yml'), 'utf8');
                    const model = {
                        version: '1.0',
                        steps: {
                            BuildingDockerImage: {
                                title: 'Building Docker Image',
                                type: 'build',
                                image_name: 'codefresh/itai-15',
                                working_directory: './',
                                dockerfile: {
                                    content: 'From alpine:latest'
                                },
                                registry: 'reg',
                                disable_push: true,
                                tags: [
                                    'tag1',
                                    'tag2'
                                ],
                                cache_from: [
                                    'some-registry/some-image:master',
                                    'some-registry/some-image:branch1',
                                ],
                            }
                        }
                    };
                    const context = {
                        git: [
                            { metadata: { name: 'git' } },
                            { metadata: { name: 'git2', default: true } }
                        ],
                        registries: [
                            { name: 'reg' }, { name: 'reg2', default: false }
                        ],
                        clusters: [
                            { selector: 'cluster' }, { selector: 'cluster2' }
                        ],
                        variables: [],
                        autoPush: true
                    };
                    const opts = {
                        build: {
                            buildVersion: 'V2'
                        }
                    };
                    validateWithContext(model, 'message', yaml, context, opts);
                    done();
                });

                it('negative', (done) => {
                    const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-v2-failure.yml'), 'utf8');
                    const model = {
                        version: '1.0',
                        steps: {
                            BuildingDockerImage: {
                                title: 'Building Docker Image',
                                type: 'build',
                                image_name: 'codefresh/itai-15',
                                working_directory: './',
                                dockerfile: {
                                    content: 'From alpine:latest'
                                },
                                registry: 'reg',
                                disable_push: true,
                                tags: [
                                    'tag1',
                                    'tag2'
                                ],
                                cache_from: [
                                    0,
                                    false,
                                ],
                            }
                        }
                    };
                    const context = {
                        git: [
                            { metadata: { name: 'git' } },
                            { metadata: { name: 'git2', default: true } }
                        ],
                        registries: [
                            { name: 'reg' }, { name: 'reg2', default: false }
                        ],
                        clusters: [
                            { selector: 'cluster' }, { selector: 'cluster2' }
                        ],
                        variables: [],
                        autoPush: true
                    };
                    const opts = {
                        build: {
                            buildVersion: 'V2'
                        }
                    };

                    const expectedMessage = {
                        details: [
                            {
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'context': {
                                    'key': 'steps'
                                },
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'level': 'step',
                                'lines': 3,
                                'message': '"0" must be a string',
                                'path': 'steps',
                                'stepName': 'BuildingDockerImage',
                                'type': 'Validation'
                            },
                            {
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'context': {
                                    'key': 'steps'
                                },
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'level': 'step',
                                'lines': 3,
                                'message': '"1" must be a string',
                                'path': 'steps',
                                'stepName': 'BuildingDockerImage',
                                'type': 'Validation'
                            },
                        ],
                        warningDetails: [],
                    };

                    validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, opts);
                    done();
                });
            });

            describe('buildx + platform', () => {
                const context = {
                    git: [
                        { metadata: { name: 'git' } },
                        { metadata: { name: 'git2', default: true } }
                    ],
                    registries: [
                        { name: 'reg' }, { name: 'reg2', default: false }
                    ],
                    clusters: [
                        { selector: 'cluster' }, { selector: 'cluster2' }
                    ],
                    variables: [],
                    autoPush: true
                };
                const opts = {
                    build: {
                        buildVersion: 'V2'
                    }
                };
                const createBuildStepTemplate = () => ({
                    title: 'Building Docker Image',
                    type: 'build',
                    image_name: 'codefresh/test',
                    working_directory: './',
                    dockerfile: {
                        content: 'From alpine:latest'
                    },
                    registry: 'reg',
                    tags: [
                        'tag1',
                        'tag2'
                    ],
                });

                it('positive', (done) => {
                    const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-buildx-success.yml'), 'utf8');
                    const model = {
                        version: '1.0',
                        steps: {
                            BuildingDockerImage_BuildxNull: {
                                ...createBuildStepTemplate(),
                                // buildx: true,
                            },
                            BuildingDockerImage_BuildxBooleanFalse: {
                                ...createBuildStepTemplate(),
                                buildx: false,
                            },
                            BuildingDockerImage_BuildxBooleanTrue: {
                                ...createBuildStepTemplate(),
                                platform: 'linux/amd64,linux/arm64',
                                buildx: true,
                            },
                            BuildingDockerImage_BuildxEmptyObject: {
                                ...createBuildStepTemplate(),
                                platform: 'linux/amd64,linux/arm64',
                                buildx: {},
                            },
                            BuildingDockerImage_BuildxObjectWithQemuAndBuilderEmptyObjects: {
                                ...createBuildStepTemplate(),
                                platform: 'linux/amd64,linux/arm64',
                                buildx: {
                                    builder: {},
                                    qemu: {},
                                },
                            },
                            BuildingDockerImage_BuildxObjectWithQemuAndBuilderStringParameters: {
                                ...createBuildStepTemplate(),
                                platform: 'linux/amd64,linux/arm64',
                                buildx: {
                                    qemu: {
                                        image: 'test-image:test',
                                        platforms: 'linux/amd64,linux/arm64',
                                    },
                                    builder: {
                                        driver: 'test-driver',
                                        driver_opts: '--test=test',
                                    },
                                },
                            },
                        }
                    };

                    validateWithContext(model, 'message', yaml, context, opts);
                    done();
                });

                it('negative', (done) => {
                    const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-buildx-failure.yml'), 'utf8');
                    const model = {
                        version: '1.0',
                        steps: {
                            BuildingDockerImage_BuildxOnlyAllowedToBeBooleanOrObject: {
                                ...createBuildStepTemplate(),
                                buildx: 'test string',
                            },
                            BuildingDockerImage_PlatformCannotBeUsedWhenBuildxDisabled1: {
                                ...createBuildStepTemplate(),
                                platform: 'linux/arm64',
                                buildx: false,
                            },
                            BuildingDockerImage_PlatformCannotBeUsedWhenBuildxDisabled2: {
                                ...createBuildStepTemplate(),
                                platform: 'linux/arm64',
                                // buildx: false, # empty
                            },
                            BuildingDockerImage_PlatformMustBeString: {
                                ...createBuildStepTemplate(),
                                platform: 123,
                                buildx: true,
                            },
                        }
                    };
                    const expectedMessage = {
                        details: [
                            {
                                'message': '"buildx" must be a boolean',
                                'type': 'Validation',
                                'path': 'steps',
                                'context': {
                                    'key': 'steps'
                                },
                                'level': 'step',
                                'stepName': 'BuildingDockerImage_BuildxOnlyAllowedToBeBooleanOrObject',
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'lines': 15
                            },
                            {
                                'message': '"buildx" must be an object',
                                'type': 'Validation',
                                'path': 'steps',
                                'context': {
                                    'key': 'steps'
                                },
                                'level': 'step',
                                'stepName': 'BuildingDockerImage_BuildxOnlyAllowedToBeBooleanOrObject',
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'lines': 15
                            },
                            {
                                'message': '"platform" is not allowed. Did you mean "platform"?',
                                'type': 'Validation',
                                'path': 'steps',
                                'context': {
                                    'key': 'steps'
                                },
                                'level': 'step',
                                'stepName': 'BuildingDockerImage_PlatformCannotBeUsedWhenBuildxDisabled1',
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'lines': 29,
                                'suggestion': {
                                    'from': 'platform',
                                    'to': 'platform'
                                }
                            },
                            {
                                'message': '"platform" is not allowed. Did you mean "platform"?',
                                'type': 'Validation',
                                'path': 'steps',
                                'context': {
                                    'key': 'steps'
                                },
                                'level': 'step',
                                'stepName': 'BuildingDockerImage_PlatformCannotBeUsedWhenBuildxDisabled2',
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'lines': 44,
                                'suggestion': {
                                    'from': 'platform',
                                    'to': 'platform'
                                }
                            },
                            {
                                'message': '"platform" must be a string. Current value: 123 ',
                                'type': 'Validation',
                                'path': 'steps',
                                'context': {
                                    'key': 'steps'
                                },
                                'level': 'step',
                                'stepName': 'BuildingDockerImage_PlatformMustBeString',
                                'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                                'actionItems': 'Please make sure you have all the required fields and valid values',
                                'lines': 59
                            }
                        ],
                        warningDetails: [],
                    };

                    validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, opts);
                    done();
                });
            });

            describe('tag_policy', () => {
                it('positive', (done) => {
                    const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-tag-policy.yml'), 'utf8');
                    const model = jsyaml.load(yaml);
                    const context = {
                        git: [
                        ],
                        registries: [
                            { name: 'mydefaultReg', default: true }
                        ],
                        clusters: [
                        ],
                        variables: [],
                        autoPush: true
                    };
                    const opts = {
                        build: {
                            buildVersion: 'V2'
                        }
                    };
                    validateWithContext(model, 'message', yaml, context, opts);
                    const lowercaseValue = jsyaml.load(yaml);
                    lowercaseValue.steps.BuildingDockerImage.tag_policy = 'lowercase';
                    validateWithContext(lowercaseValue, 'message', yaml, context, opts);
                    const noValue = jsyaml.load(yaml);
                    delete noValue.steps.BuildingDockerImage.tag_policy;
                    validateWithContext(noValue, 'message', yaml, context, opts);
                    noValue.steps.BuildingDockerImage['tag-policy'] = 'original';
                    validateWithContext(noValue, 'message', yaml, context, opts);
                    done();
                });
                it('negative', (done) => {
                    const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-tag-policy.yml'), 'utf8');
                    const context = {
                        git: [
                        ],
                        registries: [
                            { name: 'mydefaultReg', default: true }
                        ],
                        clusters: [
                        ],
                        variables: [],
                        autoPush: true
                    };
                    const opts = {
                        build: {
                            buildVersion: 'V2'
                        }
                    };
                    const notValidModel = jsyaml.load(yaml);
                    notValidModel.steps.BuildingDockerImage.tag_policy = 'lower';
                    try {
                        validateWithContext(notValidModel, 'message', yaml, context, opts);
                        done(new Error('Validation should have failed'));
                    } catch (err) {
                        // eslint-disable-next-line max-len
                        const expected = '"tag_policy" must be one of [original, lowercase]. Current value: lower \n';
                        expect(err.message).to.equal(expected);
                    }

                    delete notValidModel.steps.BuildingDockerImage.tag_policy;
                    notValidModel.steps.BuildingDockerImage['tag-policy'] = 'lower';
                    try {
                        validateWithContext(notValidModel, 'message', yaml, context, opts);
                        done(new Error('Validation should have failed'));
                    } catch (err) {
                        // eslint-disable-next-line max-len
                        const expected = '"tag_policy" must be one of [original, lowercase]. Current value: lower \n';
                        expect(err.message).to.equal(expected);
                    }
                    done();
                });
            });

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
                            'image_name': 'owner/jim',
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
                            'image_name': 'owner/jim',
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
                            'image_name': 'owner/jim',
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
                            'image_name': 'owner/jim',
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
                            'image_name': 'owner/jim',
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
                            'image_name': 'owner/jim',
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
                            'image_name': 'owner/jim',
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
                            'image_name': 'owner/jim',
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

            it('missing image_name', (done) => {
                const context = {
                    registries: [
                        { name: 'test_registry' }, { name: 'reg2', default: true }
                    ],
                    disablePush: true
                };
                const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-lowercase-image-name.yml'), 'utf8');

                const expectedMessage = {
                    message: `${colors.red('Yaml validation errors:\n')}\n`
                        + ` 6    ${colors.red('error')}     "image_name" is required                                                       \n`,
                    summarize: `${colors.red('✖ 1 problem (1 error, 0 warnings)')}`,
                    documentationLinks: 'Visit https://codefresh.io/docs/docs/codefresh-yaml/steps/build/ for steps documentation\n'
                };
                validateForErrorWithContext({
                    version: '1.0',
                    steps: {
                        build: {
                            type: 'build',
                        },
                    }
                }, expectedMessage, done, 'lint', yaml, context, {});
            });

            it('Lowercase image_name', (done) => {
                const context = {
                    registries: [
                        { name: 'test_registry' }, { name: 'reg2', default: true }
                    ],
                    disablePush: true
                };
                const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-lowercase-image-name.yml'), 'utf8');

                const expectedMessage = {
                    message: '',
                    warningMessage: `${colors.yellow('Yaml validation warnings:\n')}\n`
                        + ` 6    ${colors.yellow('warning')}   "image_name" should be in lowercase.                                           \n`,
                    summarize: `${colors.yellow('✖ 1 problem (0 errors, 1 warning)')}`,
                    documentationLinks: 'Visit https://codefresh.io/docs/docs/codefresh-yaml/steps/build/ for image_name documentation\n'
                };
                validateForErrorWithContext({
                    version: '1.0',
                    steps: {
                        build: {
                            type: 'build',
                            image_name: 'UpperCase/ImageName',
                        },
                    }
                }, expectedMessage, done, 'lint', yaml, context, {});
            });


            it('Lowercase image_name with vars', (done) => {
                const context = {
                    registries: [
                        { name: 'test_registry' }, { name: 'reg2', default: true }
                    ],
                    disablePush: true
                };
                const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-lowercase-image-name.yml'), 'utf8');

                validateWithContext({
                    version: '1.0',
                    steps: {
                        build: {
                            type: 'build',
                            image_name: 'user/${{CF_REPO_NAME}}',
                        },
                    }
                }, 'lint', yaml, context, { ignoreValidation: true });
                done();
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
                const values = {
                    stepName0: 'BuildingDockerImage',
                    stepName0_1: 'writing_file_1',
                    stepName0_2: 'writing_file_2',
                    stepName1: 'BuildingDockerImage2',
                    stepName1_1: 'writing_file_4',
                    stepName1_2: 'writing_file_3'
                };
                validate(JSON.parse(Mustache.render(yamlTemplateForDuplicateStepNamesTest, values)));
                done();
            });

            it('duplicate-step-names', (done) => {
                const values = {
                    stepName0: 'BuildingDockerImage',
                    stepName0_1: 'writing_file_1',
                    stepName0_2: 'writing_file_2',
                    stepName1: 'BuildingDockerImage2',
                    stepName1_1: 'writing_file_1',
                    stepName1_2: 'writing_file_2'
                };
                validateForError(JSON.parse(Mustache.render(yamlTemplateForDuplicateStepNamesTest, values)),
                    'step name exist more than once\nstep name exist more than once\n', done);
            });

            it('not-duplicate-step-names-parent-child', (done) => {
                const values = {
                    stepName0: 'BuildingDockerImage',
                    stepName0_1: 'writing_file_1',
                    stepName0_2: 'writing_file_2',
                    stepName1: 'BuildingDockerImage2',
                    stepName1_1: 'writing_file_4',
                    stepName1_2: 'writing_file_3'
                };
                validate(JSON.parse(Mustache.render(yamlTemplateForDuplicateStepNamesTest, values)));
                done();
            });

            it('duplicate-step-names-parent-child', (done) => {
                const values = {
                    stepName0: 'writing_file',
                    stepName0_1: 'writing_file',
                    stepName0_2: 'writing_file_1',
                    stepName1: 'writing_file2',
                    stepName1_1: 'writing_file2',
                    stepName1_2: 'writing_file_2'
                };
                validateForError(JSON.parse(Mustache.render(yamlTemplateForDuplicateStepNamesTest, values)),
                    'step name exist more than once\nstep name exist more than once\n', done);
            });

            it('not-duplicate-step-names-parent-child-nested', (done) => {
                const values = {
                    stepName0: 'BuildingDockerImage',
                    stepName0_1: 'writing_file_1',
                    stepName0_2: 'writing_file_2',
                    stepName0_3: 'test',
                    stepName0_3_1: 'writing_file_1_1',
                    stepName1: 'BuildingDockerImage2',
                    stepName1_1: 'writing_file_4',
                    stepName1_2: 'writing_file_3'
                };
                validate(JSON.parse(Mustache.render(yamlTemplateForNestedDuplicateStepNamesTest, values)));
                done();
            });

            it('duplicate-step-names-parent-child-nested', (done) => {
                const values = {
                    stepName0: 'BuildingDockerImage',
                    stepName0_1: 'writing_file_1',
                    stepName0_2: 'writing_file_2',
                    stepName0_3: 'BuildingDockerImage',
                    stepName0_3_1: 'writing_file_1',
                    stepName1: 'BuildingDockerImage2',
                    stepName1_1: 'writing_file_4',
                    stepName1_2: 'writing_file_3'
                };
                validateForError(JSON.parse(Mustache.render(yamlTemplateForNestedDuplicateStepNamesTest, values)),
                    'step name exist more than once\nstep name exist more than once\n', done);
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
                        'image_name': 'owner/teh-image'
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
                        'image_name': 'owner/teh-image',
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
                        'image_name': 'owner/teh-image',
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

        describe('Hooks', () => {
            describe('positive', () => {
                it('valid hooks', (done) => {
                    validate({
                        version: '1.0',
                        steps: {
                            test_freestyle: {
                                image: 'alpine',
                                hooks: {
                                    on_elected: ['echo test'],
                                    on_success: {
                                        exec: ['echo test'],
                                    },
                                    on_finish: {
                                        image: 'alpine',
                                        commands: ['echo test'],
                                    },
                                    on_fail: {
                                        exec: {
                                            image: 'alpine',
                                            commands: ['echo test'],
                                        },
                                        metadata: {
                                            set: [
                                                {
                                                    test: [
                                                        {
                                                            test: 'test'
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        annotations: {
                                            set: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: [{ test: 'test' }]
                                                }
                                            ],
                                            unset: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: ['test']
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                    });
                    done();
                });
                it('valid steps hooks with plugins / costume steps', (done) => {
                    validate({
                        version: '1.0',
                        stages: ['test'],
                        steps: {
                            test: {
                                title: 'Running test',
                                type: 'freestyle',
                                image: 'ubuntu:latest',
                                commands: ['ls'],
                                stage: 'test',
                                hooks: {
                                    on_elected: ['echo test'],
                                    on_success: {
                                        exec: ['echo test'],
                                    },
                                    on_finish: {
                                        mode: 'parallel',
                                        steps: {
                                            freestyle: {
                                                title: 'some title',
                                                type: 'freestyle',
                                                arguments: {
                                                    image: 'ubuntu:latest',
                                                    commands: ['echo test']
                                                },
                                            },
                                            clone: {
                                                title: 'clone title',
                                                type: 'git-clone',
                                                repo: 'codefresh/repo'
                                            },
                                            deploy: {
                                                type: 'helm',
                                                arguments: {
                                                    chart_name: 'test_chart',
                                                    release_name: 'first',
                                                    kube_context: 'my-kubernetes-context',
                                                    tiller_namespace: 'kube-system',
                                                    namespace: 'project',
                                                    custom_values: [
                                                        'KEY1=VAL1',
                                                        'KEY2=VAL2',
                                                        'KEY3=VAL3',
                                                    ],
                                                    custom_value_files: [
                                                        '/path/to/values.yaml',
                                                        '/path/to/values2.yaml'
                                                    ],
                                                    cmd_ps: '--wait --timeout 5'
                                                }
                                            }
                                        },
                                    },
                                    on_fail: {
                                        steps: {
                                            exec: {
                                                image: 'alpine',
                                                commands: ['echo test'],
                                            },
                                            clone: {
                                                title: 'clone title',
                                                type: 'git-clone',
                                                repo: 'codefresh/repo'
                                            },
                                            build: {
                                                title: 'Building Docker image',
                                                type: 'build',
                                                image_name: 'user/sandbox',
                                                working_directory: '${{clone}}',
                                                tag: '${{CF_BRANCH_TAG_NORMALIZED}}',
                                                dockerfile: 'Dockerfile',
                                            }
                                        },
                                    }
                                }
                            }
                        },
                    });
                    done();
                });
                it('valid steps hooks with only metadata/annotations', (done) => {
                    validate({
                        version: '1.0',
                        steps: {
                            test_freestyle: {
                                image: 'alpine',
                                hooks: {
                                    on_success: {
                                        metadata: {
                                            set: [{
                                                '${{steps.build.imageId}}': [{
                                                    'CF_QUALITY': false,
                                                }]
                                            }]
                                        }
                                    },
                                    on_fail: {
                                        annotations: {
                                            set: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: [{ test: 'test' }]
                                                }
                                            ],
                                            unset: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: ['test']
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                    });
                    done();
                });
                it('should allow shortcuts', (done) => {
                    validate({
                        version: '1.0',
                        steps: {
                            test_freestyle: {
                                image: 'alpine',
                                hooks: {
                                    on_elected: ['echo test'],
                                    on_success: {
                                        exec: ['echo test'],
                                    },
                                    on_finish: {
                                        image: 'alpine',
                                        commands: ['echo test'],
                                    },
                                    on_fail: {
                                        mode: 'parallel',
                                        fail_fast: false,
                                        steps: {
                                            first: {
                                                image: 'alpine',
                                                commands: ['echo first']
                                            },
                                            second: {
                                                image: 'alpine',
                                                commands: ['echo second']
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    });
                    done();
                });

                it('should allow freestyle', (done) => {
                    validate({
                        version: '1.0',
                        steps: {
                            test_freestyle: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        exec: {
                                            image: 'alpine',
                                            fail_fast: false,
                                            commands: ['echo test']
                                        }
                                    }
                                }
                            }
                        },
                    });
                    done();
                });

                it('should allow multiple steps', (done) => {
                    validate({
                        version: '1.0',
                        steps: {
                            test_steps: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        exec: {
                                            mode: 'parallel',
                                            fail_fast: false,
                                            steps: {
                                                first: {
                                                    image: 'alpine',
                                                    commands: ['echo first']
                                                },
                                                second: {
                                                    image: 'alpine',
                                                    commands: ['echo second']
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    });
                    done();
                });
                it('should allow costume steps inside exec', (done) => {
                    validate({
                        version: '1.0',
                        steps: {
                            test_steps: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        exec: {
                                            mode: 'parallel',
                                            fail_fast: false,
                                            steps: {
                                                main_clone: {
                                                    title: 'Cloning main repository...',
                                                    type: 'git-clone',
                                                    repo: 'some_repo',
                                                    revision: 'revision',
                                                    git: 'git context',
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
                                        },
                                        metadata: {
                                            set: [
                                                {
                                                    test: [
                                                        {
                                                            test: 'test'
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        annotations: {
                                            set: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: [{ test: 'test' }]
                                                }
                                            ],
                                            unset: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: ['test']
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                    });
                    done();
                });
                it('should allow display on set annotations', (done) => {
                    validate({
                        version: '1.0',
                        steps: {
                            test_steps: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        annotations: {
                                            set: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: [{ test: 'test', test2: 'test2' }],
                                                    display: 'test2'
                                                }
                                            ],
                                            unset: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: ['test']
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                    });
                    done();
                });
            });
            describe('negative', () => {
                it('should not allow debug', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_freestyle: {
                                image: 'alpine',
                                hooks: {
                                    on_elected: ['echo test'],
                                    on_success: {
                                        exec: ['echo test'],
                                    },
                                    on_finish: {
                                        image: 'alpine',
                                        commands: ['echo test'],
                                        debug: {
                                            phases: {
                                                before: true,
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }, '"debug" is not allowed', done);
                });
                it('should not allow hooks', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_freestyle: {
                                image: 'alpine',
                                hooks: {
                                    on_elected: ['echo test'],
                                    on_success: {
                                        exec: ['echo test'],
                                    },
                                    on_finish: {
                                        image: 'alpine',
                                        commands: ['echo test'],
                                        hooks: {
                                            on_elected: ['echo test'],
                                        }
                                    }
                                },
                            }
                        },
                    }, '"hooks" is not allowed', done);
                });
                it('should not allow old hooks', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_freestyle: {
                                image: 'alpine',
                                hooks: {
                                    on_elected: ['echo test'],
                                    on_success: {
                                        exec: ['echo test'],
                                    },
                                    on_finish: {
                                        image: 'alpine',
                                        commands: ['echo test'],
                                    }
                                },
                                on_finish: {
                                    metadata: {
                                        set: [{ test: [{ test: 'test' }] }]
                                    }
                                },
                            }
                        },
                    }, 'Either old "on_success/on_fail/on_finish"', done);
                });
                it('should not allow other then on_success/on_finish/on_fail/on_elected', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_freestyle: {
                                image: 'alpine',
                                hooks: {
                                    on_elected: ['echo test'],
                                    on_success: {
                                        exec: ['echo test'],
                                    },
                                    on_finish: {
                                        image: 'alpine',
                                        commands: ['echo test'],
                                    },
                                    on_fail: {
                                        image: 'alpine',
                                        commands: ['echo test'],
                                    },
                                    on_something: {
                                        image: 'alpine',
                                    }
                                },
                            }
                        },
                    }, '"on_something" is not allowed', done);
                });
                it('should not allow other keys on multiple steps', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_steps: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        exec: {
                                            type: 'build',
                                            mode: 'parallel',
                                            fail_fast: false,
                                            steps: {
                                                first: {
                                                    image: 'alpine',
                                                    commands: ['echo first']
                                                },
                                                second: {
                                                    image: 'alpine',
                                                    commands: ['echo second']
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }, '"type" is not allowed', done);
                });
                it('should not allow stage', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_steps: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        steps: {
                                            clone: {
                                                title: 'Cloning repository',
                                                type: 'git-clone',
                                                repo: 'user/sandbox',
                                                revision: 'master',
                                                git: 'github',
                                                stage: 'clone'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }, '"stage" is not allowed', done);
                });
                it('should not allow hooks', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_steps: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        steps: {
                                            clone: {
                                                title: 'Cloning repository',
                                                type: 'git-clone',
                                                repo: 'user/sandbox',
                                                revision: 'master',
                                                git: 'github',
                                                hooks: {},
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }, '"hooks" is not allowed', done);
                });
                it('should not allow debug', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_steps: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        steps: {
                                            clone: {
                                                title: 'Cloning repository',
                                                type: 'git-clone',
                                                repo: 'user/sandbox',
                                                revision: 'github',
                                                debug: {
                                                    phases: {
                                                        before: true,
                                                    }
                                                },
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }, '"debug" is not allowed', done);
                });
                it('should not allow display on unset annotations', (done) => {
                    validateForError({
                        version: '1.0',
                        steps: {
                            test_steps: {
                                image: 'alpine',
                                hooks: {
                                    on_fail: {
                                        annotations: {
                                            set: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: [{ test: 'test', test2: 'test2' }],
                                                    display: 'test'
                                                }
                                            ],
                                            unset: [
                                                {
                                                    entity_type: 'build',
                                                    annotations: ['test'],
                                                    display: 'test'
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                    },  '"display" is not allowed', done);
                });
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
                actionItems: 'Please make sure you have all the required fields and valid values',
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
            expect(_.size(schemas)).to.equal(13);
        });

    });

    describe('isWebUri', () => {
        describe('regular', () => {
            it('should return false when not uri', () => {
                const value = 'hobsons-platform-docker-sandbox-local-append';
                expect(isWebUri(value)).to.be.false;
            });
            it('should return true when host', () => {
                const value = 'g.codefresh.io';
                expect(isWebUri(value)).to.be.true;
            });
            it('should return true when ip', () => {
                const value = '123.123.123.123';
                expect(isWebUri(value)).to.be.true;
            });
            it('should return true when protocol and host', () => {
                const value = 'https://g.codefresh.io';
                expect(isWebUri(value)).to.be.true;
            });
            it('should return true when protocol and ip', () => {
                const value = 'https://123.93.123.93';
                expect(isWebUri(value)).to.be.true;
            });
            it('should return true when protocol, host and port', () => {
                const value = 'https://g.codefresh.io:1234';
                expect(isWebUri(value)).to.be.true;
            });
            it('should return true when protocol, host, port and path', () => {
                const value = 'https://g.codefresh.io:1234/some/path';
                expect(isWebUri(value)).to.be.true;
            });
            it('should return true when protocol, host, port, path and query', () => {
                const value = 'https://g.codefresh.io:1234/some/path?query=test';
                expect(isWebUri(value)).to.be.true;
            });
            it('should return true when protocol, host, port, path, query and locator fragment', () => {
                const value = 'https://g.codefresh.io:1234/some/path?query=test#some-fragment_test';
                expect(isWebUri(value)).to.be.true;
            });
        });
        describe('worst case', () => {
            it('should return false when not uri very long', () => {
                const value = [
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                    'hobsons-platform-docker-sandbox-local-append',
                ].join('-');
                expect(isWebUri(value)).to.be.false;
            });
            it('should return false when host with wrong char at the end', () => {
                const value = 'some.very.long.host.name.with.wrong.char.at.the.end!';
                expect(isWebUri(value)).to.be.false;
            });
            it('should return false when protocol and host with wrong char at the end', () => {
                const value = 'https://some.very.long.host.name.with.wrong.char.at.the.end!';
                expect(isWebUri(value)).to.be.false;
            });
            it('should return false when protocol and ip with wrong char at the end', () => {
                const value = 'https://123.12.123.12!';
                expect(isWebUri(value)).to.be.false;
            });
            it('should return false when protocol, host and port with wrong char at the end', () => {
                const value = 'https://some.very.long.host.name.with.wrong.char.at.the.end:1234!';
                expect(isWebUri(value)).to.be.false;
            });
            it('should return false when protocol, host, port and path with wrong char at the end', () => {
                const value = 'https://some.very.long.host.name.with.wrong.char.at.the.end:1234'
                    + '/some/very/long/path/at/the/end/to/verify/it/works!';
                expect(isWebUri(value)).to.be.false;
            });
            it('should return false when protocol, host, port, path and query with wrong char at the end', () => {
                const value = 'https://some.very.long.host.name.with.wrong.char.at.the.end:1234'
                    + '/some/very/long/path/at/the/end/to/verify/it/works'
                    + '?alot=of&query=params&to=have&more=characters!';
                expect(isWebUri(value)).to.be.false;
            });
            it('should return false when protocol, host, port, path, query and locator fragment with wrong char at the end', () => {
                const value = 'https://some.very.long.host.name.with.wrong.char.at.the.end:1234'
                    + '/some/very/long/path/at/the/end/to/verify/it/works'
                    + '?alot=of&query=params&to=have&more=characters'
                    + '#and-long_fragment-locator-at_the-end!';
                expect(isWebUri(value)).to.be.false;
            });
        });
    });
});

describe('Validate Codefresh YAML with context', () => {

    describe('message mode', () => {

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
            const expectedMessage = {
                details: [],
                warningDetails: [
                    {
                        'actionItems': undefined,
                        'code': 101,
                        'context': {
                            'key': 'git'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/variables/',
                        'level': 'workflow',
                        'lines': 8,
                        'message': 'Your Git integration uses a variable \'github\' that is not configured and will fail without defining it.',
                        'path': 'variables',
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
                        'message': 'Your registry integration uses a variable \'cfcr\' that is not configured and will fail without defining it.',
                        'path': 'variables',
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
                        'message': 'Your cluster integration uses a variable \'test-cluster\' that is not configured'
                            + ' and will fail without defining it.',
                        'path': 'variables',
                        'stepName': 'deploy',
                        'type': 'Warning'
                    }
                ]
            };
            const context = {
                git: [{ metadata: { name: 'git' } }],
                registries: [{ name: 'reg' }],
                clusters: [{ selector: 'cluster' }],
                variables: []
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
        });


        it('validate yaml with registry url at template', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-registry-url.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    push: {
                        title: 'Pushing image to cfcr',
                        type: 'push',
                        image_name: 'codefresh/test',
                        registry: '${{AWS_API_REGISTRY}}',
                        accessKeyId: '${{AWS_ACCESS_KEY_ID}}',
                        secretAccessKey: '${{AWS_SECRET_ACCESS_KEY}}',
                        candidate: '${{build}}',
                        tags: [
                            '${{CF_BRANCH_TAG_NORMALIZED}}',
                            '${{CF_REVISION}}']
                    },
                }
            };
            const context = {
                git: [],
                registries: [{ name: 'reg' }, { name: 'reg2', default: true }],
                clusters: [],
                variables: {
                    AWS_API_REGISTRY: '123456789012.dkr.ecr.eu-west-1.amazonaws.com/test-api/web'
                }
            };
            validateWithContext(model, 'message', yaml, context);
            done();
        });

        it('validate yaml with registry url', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-registry-url.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    push: {
                        title: 'Pushing image to cfcr',
                        type: 'push',
                        image_name: 'codefresh/test',
                        registry: '123456789012.dkr.ecr.eu-west-1.amazonaws.com',
                        accessKeyId: '${{AWS_ACCESS_KEY_ID}}',
                        secretAccessKey: '${{AWS_SECRET_ACCESS_KEY}}',
                        region: '${{AWS_REGION}}',
                        candidate: '${{build}}',
                        tags: [
                            '${{CF_BRANCH_TAG_NORMALIZED}}',
                            '${{CF_REVISION}}']
                    },
                }
            };
            const context = {
                git: [],
                registries: [],
                clusters: [],
                variables: []
            };
            validateWithContext(model, 'message', yaml, context);
            done();
        });

        it('validate yaml with registry long value', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-registry-catastrophic-value.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    push: {
                        title: 'Pushing image to cfcr',
                        type: 'push',
                        image_name: 'codefresh/test',
                        registry: 'hobsons-platform-docker-sandbox-local-append',
                        accessKeyId: '${{AWS_ACCESS_KEY_ID}}',
                        secretAccessKey: '${{AWS_SECRET_ACCESS_KEY}}',
                        candidate: '${{build}}',
                        tags: [
                            '${{CF_BRANCH_TAG_NORMALIZED}}',
                            '${{CF_REVISION}}']
                    },
                }
            };
            const expectedError = {
                details: [
                    {
                        actionItems: 'Add one in your account settings to continue.',
                        code: 200,
                        context: { key: undefined },
                        docsLink: 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        level: 'workflow',
                        lines: 3,
                        message: 'You have not added a registry integration.',
                        path: 'registry',
                        stepName: 'push',
                        type: 'Error'
                    }
                ],
                warningDetails: [],
            };
            const context = {
                git: [],
                registries: [],
                clusters: [],
                variables: [],
            };
            validateForErrorWithContext(model, expectedError, done, 'message', yaml, context);
            done();
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
            const expectedMessage = {
                details: [
                    {
                        'actionItems': 'Add one in your account settings to continue.',
                        'code': 100,
                        'context': { key: undefined },
                        'docsLink': 'https://codefresh.io/docs/docs/integrations/git-providers/',
                        'level': 'workflow',
                        'lines': 3,
                        'message': 'You have not added a Git integration.',
                        'path': 'git',
                        'stepName': 'main_clone',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Add one in your account settings to continue.',
                        'code': 200,
                        'context': { key: undefined },
                        'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        'level': 'workflow',
                        'lines': 9,
                        'message': 'You have not added a registry integration.',
                        'path': 'registry',
                        'stepName': 'push',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Add one in your account settings to continue.',
                        'code': 300,
                        'context': { key: undefined },
                        'docsLink': 'https://codefresh.io/docs/docs/deploy-to-kubernetes/add-kubernetes-cluster/',
                        'level': 'workflow',
                        'lines': 18,
                        'message': 'You have not added a Kubernetes cluster.',
                        'path': 'cluster',
                        'stepName': 'deploy',
                        'type': 'Error'
                    }
                ],
                warningDetails: []
            };
            const context = {
                git: [], registries: [], clusters: [], variables: []
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
        });

        it('validate yaml when pipeline have arguments', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-arguments.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    main_clone: {
                        type: 'git-clone',
                        description: 'Cloning main repository...',
                        repo: 'codefresh/test',
                        revision: '${{CF_BRANCH}}',
                        arguments: {
                            git: 'github'
                        }
                    },
                    push: {
                        title: 'Pushing image to cfcr',
                        type: 'push',
                        image_name: 'codefresh/test',
                        arguments: {
                            registry: 'cfcr'
                        },
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
            const expectedMessage = {
                details: [
                    {
                        'actionItems': 'Please check the spelling or add a new Git integration in your account settings.',
                        'code': 102,
                        'context': {
                            'key': 'git'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/integrations/git-providers/',
                        'level': 'workflow',
                        'lines': 9,
                        'message': 'Git \'github\' does not exist.',
                        'path': 'git',
                        'stepName': 'main_clone',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Please check the spelling or add a new registry in your account settings.',
                        'code': 202,
                        'context': {
                            'key': 'registry'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        'level': 'workflow',
                        'lines': 15,
                        'message': 'Registry \'cfcr\' does not exist.',
                        'path': 'registry',
                        'stepName': 'push',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Please check the spelling or add a new cluster in your account settings.',
                        'code': 302,
                        'context': {
                            'key': 'cluster'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/deploy-to-kubernetes/add-kubernetes-cluster/',
                        'level': 'workflow',
                        'lines': 25,
                        'message': 'Cluster \'test-cluster\' does not exist.',
                        'path': 'cluster',
                        'stepName': 'deploy',
                        'type': 'Error'
                    }
                ],
                warningDetails: []
            };
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
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
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
            const expectedMessage = {
                details: [
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
                ],
                warningDetails: [
                    {
                        'actionItems': 'You have additional integrations configured which can be used if defined explicitly.',
                        'code': 103,
                        'context': {
                            'key': undefined
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/git-clone/',
                        'level': 'workflow',
                        'lines': 3,
                        'message': 'You are using the default Git integration \'git2\'.',
                        'stepName': 'main_clone',
                        'path': 'git',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'You have additional integrations configured which can be used if defined explicitly.',
                        'code': 203,
                        'context': {
                            'key': undefined
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/push/',
                        'level': 'workflow',
                        'lines': 8,
                        'message': 'You are using the default registry integration \'reg2\'.',
                        'stepName': 'push',
                        'path': 'registry',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'You have additional integrations configured which can be used if defined explicitly.',
                        'code': 303,
                        'context': {
                            'key': undefined
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/deploy/',
                        'level': 'workflow',
                        'lines': 16,
                        'message': 'You are using the default cluster integration.',
                        'stepName': 'deploy',
                        'path': 'cluster',
                        'type': 'Warning'
                    }
                ]
            };
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
                variables: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
        });


        it('validate yaml when pipeline have mixed tabs and spaces', async (done) => {
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
            const expectedMessage = {
                details: [
                    {
                        'actionItems': 'Please replace all tabs with spaces.',
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
                        'actionItems': 'Please replace all tabs with spaces.',
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
                        'actionItems': 'Please replace all tabs with spaces.',
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
                        'actionItems': 'Please replace all tabs with spaces.',
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
                        'actionItems': 'Please replace all tabs with spaces.',
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
                ],
                warningDetails: []
            };
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
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
        });

        it('validate build step yaml with gcb provider full spec', async (done) => {
            validate({
                version: '1.0',
                steps: {
                    GCBuild: {
                        type: 'build',
                        image_name: 'test/image',
                        tag: 'test4',
                        dockerfile: 'Dockerfile',
                        provider: {
                            type: 'gcb',
                            arguments: {
                                google_app_creds: '${{G_CREDS}}',
                                cache: {
                                    repo: 'alexcodefresh/kaniko-cache',
                                    ttl: '10h'
                                },
                                timeout: '100s',
                                machineType: 'UNSPECIFIED',
                                diskSizeGb: 10,
                                logsBucket: 'test-logs-bucket'
                            }
                        }
                    }
                }
            });
            done();
        });

        it('validate build step yaml with gcb provider only required fields', async (done) => {
            validate({
                version: '1.0',
                steps: {
                    GCBuild: {
                        type: 'build',
                        image_name: 'test/image',
                        tag: 'test4',
                        dockerfile: 'Dockerfile',
                        provider: {
                            type: 'gcb',
                            arguments: {
                                google_app_creds: '${{G_CREDS}}',
                                cache: {
                                    repo: 'alexcodefresh/kaniko-cache',
                                    ttl: '10h'
                                }
                            }
                        }
                    }
                }
            });
            done();
        });

        it('should fail in case registry was not passed and autoPush is not part of the context', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    BuildingDockerImage: {
                        title: 'Building Docker Image',
                        type: 'build',
                        image_name: 'codefresh/itai-15',
                        working_directory: './',
                        tag: 'master',
                        dockerfile: {
                            content: 'From alpine:latest'
                        }
                    }
                }
            };
            const expectedMessage = {
                details: [
                    {
                        'code': 204,
                        'context': {
                            'key': undefined
                        },
                        'level': 'workflow',
                        'lines': 3,
                        'message': `'registry' is required`,
                        'path': 'registry',
                        'stepName': 'BuildingDockerImage',
                        'type': 'Error',
                        'actionItems': undefined,
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                    }
                ],
                warningDetails: []
            };
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
                variables: [],
                autoPush: false
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
        });

        it('should fail in case registry was not passed and autoPush is not part of the context', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    BuildingDockerImage: {
                        title: 'Building Docker Image',
                        type: 'build',
                        image_name: 'codefresh/itai-15',
                        working_directory: './',
                        tag: 'master',
                        dockerfile: {
                            content: 'From alpine:latest'
                        }
                    }
                }
            };
            const expectedMessage = {
                details: [
                    {
                        'code': 204,
                        'context': {
                            'key': undefined
                        },
                        'level': 'workflow',
                        'lines': 3,
                        'message': `'registry' is required`,
                        'path': 'registry',
                        'stepName': 'BuildingDockerImage',
                        'type': 'Error',
                        'actionItems': undefined,
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                    }
                ],
                warningDetails: []
            };
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
                variables: [],
                autoPush: false
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
        });

        it('should throw warning in case auto push is enabled but there is no default regsitry', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    BuildingDockerImage: {
                        title: 'Building Docker Image',
                        type: 'build',
                        image_name: 'codefresh/itai-15',
                        working_directory: './',
                        tag: 'master',
                        dockerfile: {
                            content: 'From alpine:latest'
                        }
                    }
                }
            };
            const expectedMessage = {
                details: [],
                warningDetails: [
                    {
                        'code': 205,
                        'context': {
                            'key': undefined
                        },
                        'level': 'workflow',
                        'lines': 3,
                        'message': `The image that will be built will not be pushed`,
                        'path': 'registry',
                        'stepName': 'BuildingDockerImage',
                        'type': 'Warning',
                        'actionItems': undefined,
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                    }
                ]
            };
            const context = {
                git: [
                    { metadata: { name: 'git' } },
                    { metadata: { name: 'git2', default: true } }
                ],
                registries: [
                    { name: 'reg' }, { name: 'reg2', default: false }
                ],
                clusters: [
                    { selector: 'cluster' }, { selector: 'cluster2' }
                ],
                variables: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
        });

        it('validate yaml with new line to space converter', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-new-line-to-space-converter.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    assume_role_dev: {
                        title: 'Assume Role',
                        image: 'chu-docker-local.jfrog.io/aws-cli:latest',
                        commands: []
                    }
                }
            };
            const context = {
                git: [
                    { metadata: { name: 'git' } },
                    { metadata: { name: 'git2', default: true } }
                ],
                registries: [
                    { name: 'reg' }, { name: 'reg2', default: false }
                ],
                clusters: [
                    { selector: 'cluster' }, { selector: 'cluster2' }
                ],
                variables: [],
                autoPush: true
            };
            const expectedMessage = {
                details: [],
                warningDetails: [
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 12,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 13,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 16,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 17,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 18,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 30,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 31,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 34,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 35,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    },
                    {
                        'actionItems': 'Align the indent to the first line after characters \'>-\'.',
                        'code': 500,
                        'context': {
                            'key': 'indention'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/what-is-the-codefresh-yaml/',
                        'level': 'workflow',
                        'lines': 36,
                        'message': 'Your YAML contains invalid indentation after characters \'>-\'.',
                        'path': 'indention',
                        'type': 'Warning'
                    }
                ]
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context);
        });

        it('validate build step yaml with gcb without google_app_creds and without google registry', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-gcb.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    GCBuild: {
                        type: 'build',
                        image_name: 'test/image/name',
                        tag: 'test4',
                        dockerfile: 'Dockerfile',
                        provider: {
                            type: 'gcb',
                            arguments: {
                                cache: {
                                    repo: 'alexcodefresh/kaniko-cache'
                                }
                            }
                        }
                    }
                }
            };

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
                variables: [],
                autoPush: true
            };

            const expectedMessage = {
                details: [
                    {
                        'actionItems': 'Add google container registry as an integration or provide an explicit credentials key',
                        'code': 206,
                        'context': {
                            'key': 'registry'
                        },
                        'level': 'workflow',
                        'lines': 3,
                        'message': 'provider.arguments.google_app_creds is required',
                        'path': 'registry',
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                        'stepName': 'GCBuild',
                        'type': 'Error'
                    }
                ],
                warningDetails: []
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, { ignoreValidation: true });
        });

        it('validate build step yaml with gcb without google_app_creds and with google registry', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-build-gcb.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    GCBuild: {
                        type: 'build',
                        image_name: 'test/image',
                        tag: 'test4',
                        dockerfile: 'Dockerfile',
                        provider: {
                            type: 'gcb',
                            arguments: {
                                cache: {
                                    repo: 'alexcodefresh/kaniko-cache'
                                }
                            }
                        }
                    }
                }
            };

            const context = {
                git: [
                    { metadata: { name: 'git' } },
                    { metadata: { name: 'git2', default: true } }
                ],
                registries: [
                    { name: 'reg', kind: 'google' }, { name: 'reg2', default: true }
                ],
                clusters: [
                    { selector: 'cluster' }, { selector: 'cluster2' }
                ],
                variables: [],
                autoPush: true
            };

            validateWithContext(model, 'message', yaml, context, { ignoreValidation: true });
            done();
        });

        it('validate yaml when registry context not found', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-registry-context.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    'clone': {
                        'type': 'git-clone',
                        'description': 'Cloning main repository...',
                        'repo': 'codefresh/test',
                        'revision': 'master'
                    },
                    'build': {
                        'title': 'Building Docker Image',
                        'type': 'build',
                        'image_name': 'codefresh/test',
                        'working_directory': '${{clone}}',
                        'dockerfile': 'Dockerfile',
                        'registry': 'reg',
                        'registry_contexts': [
                            'docker',
                            'gcr'
                        ],
                        'tag': 'latest'
                    },
                    'push': {
                        'title': 'Pushing image to gcr',
                        'type': 'push',
                        'image_name': 'codefresh/test',
                        'registry': 'reg',
                        'registry_context': 'gcr',
                        'candidate': '${{build}}',
                    },
                    'composition': {
                        'type': 'composition',
                        'title': 'Composition Step Title',
                        'description': 'Free text description',
                        'working_directory': '${{clone}}',
                        'registry_contexts': [
                            'gcr'
                        ],
                        'composition': {
                            'version': '3',
                            'services': {
                                'db': {
                                    'image': 'postgres'
                                }
                            }
                        },
                        'composition_candidates': {
                            'test_service': {
                                'image': 'us.gcr.io/test-123123/codefresh/test-codefresh/test',
                                'command': 'echo test',
                                'working_dir': '/app',
                                'environment': [
                                    'key=value'
                                ]
                            }
                        },
                        'composition_variables': [
                            'key=value'
                        ]
                    },
                    'freestyle': {
                        'image': 'us.gcr.io/test-123123/codefresh/test-codefresh/test',
                        'registry_context': 'gcr2',
                        'commands': [
                            'echo hello'
                        ]
                    }
                }
            };

            const context = {
                git: [
                    { metadata: { name: 'git' } },
                ],
                registries: [
                    { name: 'reg', kind: 'google' }, { name: 'reg2', default: true }
                ],
                variables: []
            };

            const expectedMessage = {
                details: [
                    {
                        'actionItems': 'Please make sure you have all the required fields and valid values',
                        'context': {
                            'key': 'steps'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                        'level': 'step',
                        'lines': 14,
                        'message': '"registry" is not allowed. Did you mean "registry_contexts"?',
                        'path': 'steps',
                        'stepName': 'build',
                        'type': 'Validation',
                        'suggestion': {
                            'from': 'registry',
                            'to': 'registry_contexts'
                        },
                    },
                    {
                        'actionItems': 'Please check the spelling or add a new registry in your account settings.',
                        'code': 202,
                        'context': {
                            'key': 'registry_contexts'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        'level': 'workflow',
                        'lines': 15,
                        'message': 'Registry \'docker\' does not exist.',
                        'path': 'registry_contexts',
                        'stepName': 'build',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Please check the spelling or add a new registry in your account settings.',
                        'code': 202,
                        'context': {
                            'key': 'registry_contexts'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        'level': 'workflow',
                        'lines': 15,
                        'message': 'Registry \'gcr\' does not exist.',
                        'path': 'registry_contexts',
                        'stepName': 'build',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Please check the spelling or add a new registry in your account settings.',
                        'code': 202,
                        'context': {
                            'key': 'registry_context'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        'level': 'workflow',
                        'lines': 25,
                        'message': 'Registry \'gcr\' does not exist.',
                        'path': 'registry_contexts',
                        'stepName': 'push',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Please check the spelling or add a new registry in your account settings.',
                        'code': 202,
                        'context': {
                            'key': 'registry_contexts'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        'level': 'workflow',
                        'lines': 33,
                        'message': 'Registry \'gcr\' does not exist.',
                        'path': 'registry_contexts',
                        'stepName': 'composition',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Please check the spelling or add a new registry in your account settings.',
                        'code': 202,
                        'context': {
                            'key': 'registry_context'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        'level': 'workflow',
                        'lines': 53,
                        'message': 'Registry \'gcr2\' does not exist.',
                        'path': 'registry_contexts',
                        'stepName': 'freestyle',
                        'type': 'Error'
                    }
                ],
                warningDetails: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, { ignoreValidation: true });
        });

        it('validate yaml when registry contexts has same domain', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-registry-context.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    'clone': {
                        'type': 'git-clone',
                        'description': 'Cloning main repository...',
                        'repo': 'codefresh/test',
                        'revision': 'master'
                    },
                    'build': {
                        'title': 'Building Docker Image',
                        'type': 'build',
                        'image_name': 'codefresh/test',
                        'working_directory': '${{clone}}',
                        'dockerfile': 'Dockerfile',
                        'registry': 'reg',
                        'registry_contexts': [
                            'gcr',
                            'reg'
                        ],
                        'tag': 'latest'
                    },
                    'push': {
                        'title': 'Pushing image to gcr',
                        'type': 'push',
                        'image_name': 'codefresh/test',
                        'registry': 'reg',
                        'registry_context': 'gcr',
                        'candidate': '${{build}}',
                    },
                    'composition': {
                        'type': 'composition',
                        'title': 'Composition Step Title',
                        'description': 'Free text description',
                        'working_directory': '${{clone}}',
                        'registry_contexts': [
                            'gcr',
                            'reg'
                        ],
                        'composition': {
                            'version': '3',
                            'services': {
                                'db': {
                                    'image': 'postgres'
                                }
                            }
                        },
                        'composition_candidates': {
                            'test_service': {
                                'image': 'us.gcr.io/test-123123/codefresh/test-codefresh/test',
                                'command': 'echo test',
                                'working_dir': '/app',
                                'environment': [
                                    'key=value'
                                ]
                            }
                        },
                        'composition_variables': [
                            'key=value'
                        ]
                    },
                    'freestyle': {
                        'image': 'us.gcr.io/test-123123/codefresh/test-codefresh/test',
                        'registry_context': 'gcr',
                        'commands': [
                            'echo hello'
                        ]
                    }
                }
            };

            const context = {
                git: [
                    { metadata: { name: 'git' } },
                ],
                registries: [
                    { name: 'gcr', kind: 'google', domain: 'gcr.io' },
                    { name: 'reg', kind: 'google', domain: 'gcr.io' },
                    { name: 'reg2', default: true }
                ],
                variables: []
            };

            const expectedMessage = {
                details: [
                    {
                        'actionItems': 'Please make sure you have all the required fields and valid values',
                        'context': {
                            'key': 'steps'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                        'level': 'step',
                        'lines': 14,
                        'message': '"registry" is not allowed. Did you mean "registry_contexts"?',
                        'path': 'steps',
                        'stepName': 'build',
                        'type': 'Validation',
                        'suggestion': {
                            'from': 'registry',
                            'to': 'registry_contexts'
                        },
                    },
                    {
                        'actionItems': 'Please make sure that there is no more than one registry from the same domain',
                        'code': 207,
                        'context': {
                            'key': 'registry_contexts'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                        'level': 'workflow',
                        'lines': 15,
                        'message': 'Registry contexts contains registries with same domain \'gcr.io\'',
                        'path': 'registry_contexts',
                        'stepName': 'build',
                        'type': 'Error'
                    },
                    {
                        'actionItems': 'Please make sure that there is no more than one registry from the same domain',
                        'code': 207,
                        'context': {
                            'key': 'registry_contexts'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/composition/',
                        'level': 'workflow',
                        'lines': 33,
                        'message': 'Registry contexts contains registries with same domain \'gcr.io\'',
                        'path': 'registry_contexts',
                        'stepName': 'composition',
                        'type': 'Error'
                    }
                ],
                warningDetails: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, { ignoreValidation: true });
        });

        it('validate yaml when registry context contains runtime variable', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-registry-context.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    'clone': {
                        'type': 'git-clone',
                        'description': 'Cloning main repository...',
                        'repo': 'codefresh/test',
                        'revision': 'master'
                    },
                    'build': {
                        'title': 'Building Docker Image',
                        'type': 'build',
                        'image_name': 'codefresh/test',
                        'working_directory': '${{clone}}',
                        'dockerfile': 'Dockerfile',
                        'registry': 'reg',
                        'registry_contexts': [
                            '${{docker}}',
                            '${{gcr}}'
                        ],
                        'tag': 'latest'
                    },
                    'push': {
                        'title': 'Pushing image to gcr',
                        'type': 'push',
                        'image_name': 'codefresh/test',
                        'registry': 'reg',
                        'registry_context': '${{gcr}}',
                        'candidate': '${{build}}',
                    },
                    'composition': {
                        'type': 'composition',
                        'title': 'Composition Step Title',
                        'description': 'Free text description',
                        'working_directory': '${{clone}}',
                        'registry_contexts': [
                            '${{docker}}',
                            '${{gcr}}'
                        ],
                        'composition': {
                            'version': '3',
                            'services': {
                                'db': {
                                    'image': 'postgres'
                                }
                            }
                        },
                        'composition_candidates': {
                            'test_service': {
                                'image': 'us.gcr.io/test-123123/codefresh/test-codefresh/test',
                                'command': 'echo test',
                                'working_dir': '/app',
                                'environment': [
                                    'key=value'
                                ]
                            }
                        },
                        'composition_variables': [
                            'key=value'
                        ]
                    },
                    'freestyle': {
                        'image': 'us.gcr.io/test-123123/codefresh/test-codefresh/test',
                        'registry_context': '${{gcr2}}',
                        'commands': [
                            'echo hello'
                        ]
                    }
                }
            };

            const context = {
                git: [
                    { metadata: { name: 'git' } },
                ],
                registries: [
                    { name: 'reg', kind: 'google' }, { name: 'reg2', default: true }
                ],
                variables: []
            };

            const expectedMessage = {
                details: [
                    {
                        'actionItems': 'Please make sure you have all the required fields and valid values',
                        'context': {
                            'key': 'steps'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                        'level': 'step',
                        'lines': 14,
                        'message': '"registry" is not allowed. Did you mean "registry_contexts"?',
                        'path': 'steps',
                        'stepName': 'build',
                        'type': 'Validation',
                        'suggestion': {
                            'from': 'registry',
                            'to': 'registry_contexts'
                        },
                    },
                ],
                warningDetails: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, { ignoreValidation: true });
        });

        it('validate yaml with pending approval', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-template.yml'), 'utf8');
            const model = {
                version: '1.0',
                stages: [
                    'clone',
                    'build',
                    'push',
                    'integration'
                ],
                steps: {
                    'main_clone': {
                        'type': 'git-clone',
                        'description': 'Cloning main repository...',
                        'repo': 'vadim-kharin-codefresh/test',
                        'revision': '${{CF_BRANCH}}',
                        'git': 'github',
                        'stage': 'clone'
                    },
                    'build': {
                        'title': 'Building Docker Image',
                        'type': 'build',
                        'image_name': 'vadim-kharin-codefresh/test',
                        'tag': '${{CF_BRANCH_TAG_NORMALIZED}}',
                        'dockerfile': 'Dockerfile',
                        'stage': 'build'
                    },
                    'approval_for_push': {
                        'type': 'pending-approval',
                        'title': 'Should we run push',
                        'when': {
                            'branch': {
                                'only': [
                                    'master'
                                ]
                            }
                        },
                        'stage': 'push'
                    },
                    'parallel_push': {
                        'type': 'parallel',
                        'steps': {
                            'annotate_build': {
                                'title': 'Annotating Build',
                                'image': '${{build}}',
                                'working_directory': 'IMAGE_WORK_DIR',
                                'commands': [
                                    'echo Annotating Build...'
                                ],
                                'on_success': {
                                    'metadata': {
                                        'set': [
                                            {
                                                '${{build.imageId}}': [
                                                    {
                                                        'CF_QUALITY': true
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                },
                                'on_error': {
                                    'metadata': {
                                        'set': [
                                            {
                                                '${{build.imageId}}': [
                                                    {
                                                        'CF_QUALITY': false
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },
                            'push': {
                                'title': 'Pushing image to cfcr',
                                'type': 'push',
                                'image_name': 'vadim-kharin-codefresh/test',
                                'registry': 'cfcr',
                                'candidate': '${{build}}',
                                'tags': [
                                    '${{CF_BRANCH_TAG_NORMALIZED}}',
                                    '${{CF_REVISION}}'
                                ]
                            },
                            'deploy': {
                                'title': 'deploying to cluster',
                                'type': 'deploy',
                                'kind': 'kubernetes',
                                'service': 'kubernetes',
                                'cluster': 'gke_savvy-badge-103912_us-central1-a_saas-3731-test-cluster',
                                'namespace': 'default',
                                'arguments': {
                                    'image': '${{build}}',
                                    'registry': 'cfcr',
                                    'commands': [
                                        '/cf-deploy-kubernetes deployment.yml'
                                    ]
                                }
                            }
                        },
                        'stage': 'push'
                    }
                }
            };

            const context = {
                git: [
                ],
                registries: [
                ],
                variables: []
            };
            const expectedMessage = {
                details: [
                    {
                        'code': 204,
                        'context': {
                            'key': undefined
                        },
                        'level': 'workflow',
                        'lines': 0,
                        'message': `'registry' is required`,
                        'path': 'registry',
                        'stepName': 'build',
                        'type': 'Error',
                        'actionItems': undefined,
                        'docsLink': 'https://codefresh.io/docs/docs/codefresh-yaml/steps/build/',
                    },
                    {
                        'actionItems': 'Add one in your account settings to continue.',
                        'message': 'You have not added a Git integration.',
                        'type': 'Error',
                        'path': 'git',
                        'context': { 'key': undefined },
                        'level': 'workflow',
                        'code': 100,
                        'stepName': 'main_clone',
                        'docsLink': 'https://codefresh.io/docs/docs/integrations/git-providers/',
                        'lines': 3,
                    }, {
                        'actionItems': 'Add one in your account settings to continue.',
                        'message': 'You have not added a registry integration.',
                        'type': 'Error',
                        'path': 'registry',
                        'context': { 'key': undefined },
                        'level': 'workflow',
                        'code': 200,
                        'stepName': 'push',
                        'docsLink': 'https://codefresh.io/docs/docs/docker-registries/external-docker-registries/',
                        'lines': 9,
                    }, {
                        'actionItems': 'Add one in your account settings to continue.',
                        'message': 'You have not added a Kubernetes cluster.',
                        'type': 'Error',
                        'path': 'cluster',
                        'context': { 'key': undefined },
                        'level': 'workflow',
                        'code': 300,
                        'stepName': 'deploy',
                        'docsLink': 'https://codefresh.io/docs/docs/deploy-to-kubernetes/add-kubernetes-cluster/',
                        'lines': 18,
                    }],
                warningDetails: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, { ignoreValidation: true });
        });

        it('validate yaml with helm', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-helm.yml'), 'utf8');
            const model = {
                version: '1.0',
                stages: [
                    'prepare',
                    'build',
                    'store',
                    'deploy'
                ],
                steps: {
                    'clone': {
                        'title': 'Cloning main repository...',
                        'stage': 'prepare',
                        'type': 'git-clone',
                        'repo': 'codefresh-contrib/helm-sample-app',
                        'revision': '${{CF_BRANCH}}',
                        'git': 'github'
                    },
                    'store': {
                        'title': 'Storing Helm Chart',
                        'type': 'helm',
                        'stage': 'store',
                        'working_directory': './helm-sample-app',
                        'arguments': {
                            'action': 'push',
                            'helm_version': '2.17.0',
                            'chart_name': 'charts/helm-example',
                            'kube_context': 'anais-cluster@codefresh-sa'
                        }
                    },
                    'deploy': {
                        'type': 'helm',
                        'stage': 'deploy',
                        'working_directory': './helm-sample-app',
                        'arguments': {
                            'action': 'install',
                            'chart_name': 'charts/helm-example',
                            'release_name': 'my-go-chart-prod',
                            'helm_version': '3.0.2',
                            'kube_context': 'anais-cluster@codefresh-sa',
                            'custom_values': [
                                'buildID=${{CF_BUILD_ID}}',
                                'image_pullPolicy=Always',
                                'image_tag=2.0.0',
                                'replicaCount=3'
                            ]
                        }
                    }
                }
            };

            const context = {
                git: [
                    { metadata: { name: 'github' } },
                ],
                registries: [
                ],
                variables: []
            };
            const expectedMessage = {
                details: [],
                warningDetails: [
                    {
                        'actionItems': 'Please view our documentation for more details.',
                        'code': 601,
                        'context': {
                            'key': 'helm_version'
                        },
                        'docsLink': 'https://codefresh.io/docs/docs/new-helm/helm2-support',
                        'level': 'workflow',
                        'lines': 22,
                        'message': 'Codefresh will discontinue support for Helm 2 on July 16 2021.',
                        'path': 'helm',
                        'stepName': 'store',
                        'type': 'Warning'
                    }
                ],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'message', yaml, context, { ignoreValidation: false });
        });

        it('validate yaml with wrong aws region', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-registry-catastrophic-value.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    push: {
                        title: 'Pushing image to ecr',
                        type: 'push',
                        image_name: 'codefresh/test',
                        registry: 'myecr',
                        accessKeyId: '${{AWS_ACCESS_KEY_ID}}',
                        secretAccessKey: '${{AWS_SECRET_ACCESS_KEY}}',
                        region: 'not-a-region',
                        candidate: '${{build}}',
                        tags: [
                            '${{CF_BRANCH_TAG_NORMALIZED}}',
                            '${{CF_REVISION}}']
                    },
                }
            };
            const expectedError = {
                details: [
                    {
                        actionItems: 'Please make sure the specified region is written in the correct format',
                        code: 206,
                        context: { key: 'registry' },
                        docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/steps/push/',
                        level: 'workflow',
                        lines: 7,
                        message: 'aws region is invalid',
                        path: 'registry',
                        stepName: 'push',
                        type: 'Error'
                    }
                ],
                warningDetails: [],
            };
            const context = {
                git: [],
                registries: [
                    {
                        name: 'myecr',
                        provider: 'ecr',
                    }
                ],
                clusters: [],
                variables: { AWS_REGION: 'invalid' }
            };
            validateForErrorWithContext(model, expectedError, done, 'message', yaml, context);
            done();
        });

        it('validate yaml with correct aws region but a non-ecr integration', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-registry-catastrophic-value.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    push: {
                        title: 'Pushing image to quay',
                        type: 'push',
                        image_name: 'codefresh/test',
                        registry: 'non-ecr',
                        accessKeyId: '${{AWS_ACCESS_KEY_ID}}',
                        secretAccessKey: '${{AWS_SECRET_ACCESS_KEY}}',
                        region: 'us-east-1',
                        candidate: '${{build}}',
                        tags: [
                            '${{CF_BRANCH_TAG_NORMALIZED}}',
                            '${{CF_REVISION}}']
                    },
                }
            };
            const expectedError = {
                details: [
                    {
                        actionItems: 'Cross-region pushes are currently supported only for ECR',
                        code: 206,
                        context: { key: 'registry' },
                        docsLink: 'https://codefresh.io/docs/docs/codefresh-yaml/steps/push/',
                        level: 'workflow',
                        lines: 7,
                        message: 'Unable to specify region with a registry of type: non-ecr',
                        path: 'registry',
                        stepName: 'push',
                        type: 'Error',
                    }
                ],
                warningDetails: [],
            };
            const context = {
                git: [],
                registries: [{
                    name: 'non-ecr',
                    provider: 'non-ecr'
                }],
                clusters: [],
                variables: [],
            };
            validateForErrorWithContext(model, expectedError, done, 'message', yaml, context);
            done();
        });

    });

    describe('lint mode', () => {
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
            const expectedMessage = {
                message: `${colors.red('Yaml validation errors:\n')}`
                    + '\n'
                    + ` 16   ${colors.red('error')}     "cluster" is required                                                          \n`,
                warningMessage: `${colors.yellow('Yaml validation warnings:\n')}\n`
                    + ` 3    ${colors.yellow('warning')}   You are using the default Git integration 'git2'.                              \n`
                    + ` 8    ${colors.yellow('warning')}   You are using the default registry integration 'reg2'.                         \n`
                    + ` 16   ${colors.yellow('warning')}   You are using the default cluster integration.                                 \n`,
                summarize: `${colors.red('✖ 4 problems (1 error, 3 warnings)')}`,
                documentationLinks: 'Visit https://codefresh.io/docs/docs/codefresh-yaml/steps/git-clone/ for git documentation\n'
                    + 'Visit https://codefresh.io/docs/docs/codefresh-yaml/steps/push/ for registry documentation\n'
                    + 'Visit https://codefresh.io/docs/docs/codefresh-yaml/steps/deploy/ for cluster documentation\n'
                    + 'Visit https://codefresh.io/docs/docs/codefresh-yaml/steps/deploy/ for steps documentation\n'
            };
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
                variables: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'lint', yaml, context);
        });

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
            const expectedMessage = {
                message: '',
                warningMessage: `${colors.yellow('Yaml validation warnings:\n')}\n`
                    + ` 8    ${colors.yellow('warning')}   Your Git integration uses a variable 'github' that is not configured and will  \n`
                    + '                fail without defining it.                                                      \n'
                    + ` 13   ${colors.yellow('warning')}   Your registry integration uses a variable 'cfcr' that is not configured and    \n`
                    + '                will fail without defining it.                                                 \n'
                    + ` 23   ${colors.yellow('warning')}   Your cluster integration uses a variable 'test-cluster' that is not configured \n`
                    + '                and will fail without defining it.                                             \n',
                summarize: `${colors.yellow('✖ 3 problems (0 errors, 3 warnings)')}`,
                documentationLinks: 'Visit https://codefresh.io/docs/docs/codefresh-yaml/variables/ for variables documentation\n'
            };
            const context = {
                git: [{ metadata: { name: 'git' } }],
                registries: [{ name: 'reg' }],
                clusters: [{ selector: 'cluster' }],
                variables: []
            };
            validateForErrorWithContext(model, expectedMessage, done, 'lint', yaml, context);
        });

        it('CF-default git context must be valid', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-arguments.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    main_clone: {
                        type: 'git-clone',
                        description: 'Cloning main repository...',
                        repo: 'codefresh/test',
                        revision: '${{CF_BRANCH}}',
                        arguments: {
                            git: 'CF-default'
                        }
                    },
                    push: {
                        title: 'Pushing image to cfcr',
                        type: 'push',
                        image_name: 'codefresh/test',
                        arguments: {
                            registry: 'cfcr'
                        },
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
            const expectedMessage = {
                message: `${colors.red('Yaml validation errors:\n')}`
                    + '\n'
                    + ` 15   ${colors.red('error')}     Registry 'cfcr' does not exist.                                                \n`
                    + ` 25   ${colors.red('error')}     Cluster 'test-cluster' does not exist.                                         \n`,
                warningMessage: undefined,
                summarize: `${colors.red('✖ 2 problems (2 errors, 0 warnings)')}`,
                documentationLinks: 'Visit https://codefresh.io/docs/docs/docker-registries/external-docker-registries/ for registry documentation\n'
                    + 'Visit https://codefresh.io/docs/docs/deploy-to-kubernetes/add-kubernetes-cluster/ for cluster documentation\n'
            };
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
            validateForErrorWithContext(model, expectedMessage, done, 'lint', yaml, context);
        });

        it('validate yaml when pipeline have arguments', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-arguments.yml'), 'utf8');
            const model = {
                version: '1.0',
                steps: {
                    main_clone: {
                        type: 'git-clone',
                        description: 'Cloning main repository...',
                        repo: 'codefresh/test',
                        revision: '${{CF_BRANCH}}',
                        arguments: {
                            git: 'github'
                        }
                    },
                    push: {
                        title: 'Pushing image to cfcr',
                        type: 'push',
                        image_name: 'codefresh/test',
                        arguments: {
                            registry: 'cfcr'
                        },
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
            const expectedMessage = {
                message: `${colors.red('Yaml validation errors:\n')}`
                    + '\n'
                    + ` 9    ${colors.red('error')}     Git 'github' does not exist.                                                   \n`
                    + ` 15   ${colors.red('error')}     Registry 'cfcr' does not exist.                                                \n`
                    + ` 25   ${colors.red('error')}     Cluster 'test-cluster' does not exist.                                         \n`,
                warningMessage: undefined,
                summarize: `${colors.red('✖ 3 problems (3 errors, 0 warnings)')}`,
                documentationLinks: 'Visit https://codefresh.io/docs/docs/integrations/git-providers/ for git documentation\n'
                    + 'Visit https://codefresh.io/docs/docs/docker-registries/external-docker-registries/ for registry documentation\n'
                    + 'Visit https://codefresh.io/docs/docs/deploy-to-kubernetes/add-kubernetes-cluster/ for cluster documentation\n'
            };
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
            validateForErrorWithContext(model, expectedMessage, done, 'lint', yaml, context);
        });

        it('validate yaml with 1 warning', async (done) => {
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
            const expectedMessage = {
                message: '',
                warningMessage: `${colors.yellow('Yaml validation warnings:\n')}\n`
                    + ` 23   ${colors.yellow('warning')}   Your cluster integration uses a variable 'test-cluster' that is not configured \n`
                    + `                and will fail without defining it.                                             \n`,
                summarize: `${colors.yellow('✖ 1 problem (0 errors, 1 warning)')}`,
                documentationLinks: 'Visit https://codefresh.io/docs/docs/codefresh-yaml/variables/ for variables documentation\n'
            };
            const context = {
                git: [{ metadata: { name: 'git' } }],
                registries: [{ name: 'reg' }],
                clusters: [{ selector: 'cluster' }],
                variables: { github: '', cfcr: '' }
            };
            validateForErrorWithContext(model, expectedMessage, done, 'lint', yaml, context);
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
            const expectedMessage = {
                message: `${colors.red('Yaml validation errors:\n')}`
                    + '\n'
                    + ` 16   ${colors.red('error')}     "cluster" is required                                                          \n`,
                warningMessage: undefined,
                summarize: `${colors.red('✖ 1 problem (1 error, 0 warnings)')}`,
                documentationLinks: 'Visit https://codefresh.io/docs/docs/codefresh-yaml/steps/deploy/ for steps documentation\n'
            };
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
                variables: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'lint', yaml, context, { ignoreValidation: true });
        });

        it('validate yaml with helm', async (done) => {
            const yaml = fs.readFileSync(path.join(currentPath, './test-yamls/yaml-with-helm.yml'), 'utf8');
            const model = {
                version: '1.0',
                stages: [
                    'prepare',
                    'build',
                    'store',
                    'deploy'
                ],
                steps: {
                    'clone': {
                        'title': 'Cloning main repository...',
                        'stage': 'prepare',
                        'type': 'git-clone',
                        'repo': 'codefresh-contrib/helm-sample-app',
                        'revision': '${{CF_BRANCH}}',
                        'git': 'github'
                    },
                    'store': {
                        'title': 'Storing Helm Chart',
                        'type': 'helm',
                        'stage': 'store',
                        'working_directory': './helm-sample-app',
                        'arguments': {
                            'action': 'push',
                            'helm_version': '2.17.0',
                            'chart_name': 'charts/helm-example',
                            'kube_context': 'anais-cluster@codefresh-sa'
                        }
                    },
                    'deploy': {
                        'type': 'helm',
                        'stage': 'deploy',
                        'working_directory': './helm-sample-app',
                        'arguments': {
                            'action': 'install',
                            'chart_name': 'charts/helm-example',
                            'release_name': 'my-go-chart-prod',
                            'helm_version': '3.0.2',
                            'kube_context': 'anais-cluster@codefresh-sa',
                            'custom_values': [
                                'buildID=${{CF_BUILD_ID}}',
                                'image_pullPolicy=Always',
                                'image_tag=2.0.0',
                                'replicaCount=3'
                            ]
                        }
                    }
                }
            };
            const expectedMessage = {
                message: '',
                warningMessage: `${colors.yellow('Yaml validation warnings:\n')}\n`
                    + ` 22   ${colors.yellow('warning')}   Codefresh will discontinue support for Helm 2 on July 16 2021.                 \n`,
                summarize: `${colors.yellow('✖ 1 problem (0 errors, 1 warning)')}`,
                documentationLinks: 'Visit https://codefresh.io/docs/docs/new-helm/helm2-support for helm documentation\n'
            };
            const context = {
                git: [
                    { metadata: { name: 'github' } },
                ],
                registries: [
                ],
                clusters: [
                ],
                variables: [],
                autoPush: true
            };
            validateForErrorWithContext(model, expectedMessage, done, 'lint', yaml, context, { ignoreValidation: false });
        });

    });

});
