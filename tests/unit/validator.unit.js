/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions,no-template-curly-in-string */

'use strict';

const chai = require('chai');

const expect    = chai.expect;
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

const Validator = require('../../validator');

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
            }, 'Unable to find a validator for schema version 0.1', done);
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
                            cmd: ["yo"],
                            commands: ["what"]
                        }
                    }
                }, '"commands" conflict with forbidden peer "cmd"', done);
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
                                        someValue: "123"
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
                                        "TEST=hello",
                                        "GOODBYE=you"
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
                                working_directory: "/asdasd/asd"
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
                                working_directory: "/asdasd/asd"
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
                                        someValue: "123"
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
                                        "TEST=hello",
                                        "GOODBYE=you"
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
                                commands: [ ]
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
                                commands: [ '   ', '' ]
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
                                working_directory: "/asdasd/asd"
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
                                working_directory: "/asdasd/asd"
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
                            jim: 'bob'
                        }
                    },
                    string_composition: {
                        'type': 'composition',
                        'composition': 'path/to/composition',
                        'composition_candidates': {
                            jim: 'bob'
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
                            retry: {
                                exponentialFactor: ""
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
                            retry: {
                                maxAttempts: ""
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
                            retry: {
                                delay: ""
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
});
