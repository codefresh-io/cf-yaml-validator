// TODO: Explain what this file does. (If you see this, blame noam which created this on 11/9/16)

'use strict';

const yaml = require('js-yaml');
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
                version:           '1.0',
                whatIsThisElement: '',
                steps:             {
                    jim: {
                        image: 'bob'
                    }
                }
            }, '"whatIsThisElement" is not allowed', done);
        });

        it('Unknown version', (done) => {

            validateForError({
                version:           '0.1',
                steps:             {
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
                    steps:   {
                        jim: { type: 'invalid' }
                    }
                });
            });

            it('Working directory on a push step', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type:                'push',
                            candidate:           'bob',
                            'working_directory': 'meow'
                        }
                    }
                }, '"working_directory" is not allowed', done);
            });

            it('Credentials on a build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type:         'build',
                            'image_name': 'jimb',
                            credentials:  {
                                username: 'jim',
                                password: 'bob'
                            }
                        }
                    }
                }, '"credentials" is not allowed', done);
            });

            it('Empty credentials', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type:        'git-clone',
                            repo:        'jim',
                            credentials: {}
                        }
                    }
                }, '"username" is required', done);
            });

            it('Non-string working directory', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            image:               'myimage',
                            'working_directory': {}
                        }
                    }
                }, '"working_directory" must be a string', done);
            });

            it('Non-string description', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':        'build',
                            'image_name':  'jimb',
                            'description': {}
                        }
                    }
                }, '"description" must be a string', done);
            });

            it('Non-string title', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'build',
                            'image_name': 'jimb',
                            'title':      {}
                        }
                    }
                }, '"title" must be a string', done);
            });

            it('Non-boolean fail-fast', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'build',
                            'image_name': 'jimb',
                            'fail_fast':  {}
                        }
                    }
                }, '"fail_fast" must be a boolean', done);
            });

            it('Non-string tag', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'build',
                            'image_name': 'jim',
                            'tag':        []
                        }
                    }
                }, '"tag" must be a string', done);
            });
        });

        describe('Freestyle step attributes', () => {

            it('Non-string image', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: { image: {} }
                    }
                }, '"image" must be a string', done);
            });

            it('Image on non-freestyle step', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type:         'build',
                            'image_name': 'jimb',
                            image:        'bobson'
                        }
                    }
                }, '"image" is not allowed', done);
            });

            it('Non-array commands', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            image:    'bob',
                            commands: ''
                        }
                    }
                }, '"commands" must be an array', done);
            });

            it('Non-string commands', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            image:    'bob',
                            commands: [{}, 'asdasd']
                        }
                    }
                }, '"0" must be a string', done);
            });

            it('Non-array environment', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            image:       'bob',
                            environment: ''
                        }
                    }
                }, '"environment" must be an array', done);
            });

            it('Non-string environment', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            image:       'bob',
                            environment: [{}, 'asdasd']
                        }
                    }
                }, '"0" must be a string', done);
            });
        });

        describe('Git clone step attributes', () => {

            it('Non-existing repo', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type: 'git-clone',
                        }
                    }
                }, '"repo" is required', done);
            });

            it('Non-string repo', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
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
                    steps:   {
                        jim: {
                            type:         'build',
                            'image_name': 'jimb',
                            repo:         'github.com/owner/repo'
                        }
                    }
                }, '"repo" is not allowed', done);
            });

            it('Non-string revision', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type:     'git-clone',
                            repo:     'github.com/owner/repo',
                            revision: []
                        }
                    }
                }, '"revision" must be a string', done);
            });

            it('Revision on non-git clone step', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type:         'build',
                            'image_name': 'jimb',
                            revision:     'github.com/owner/repo'
                        }
                    }
                }, '"revision" is not allowed', done);
            });
        });

        describe('Build step attributes', () => {

            it('Non-existing image name', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type: 'build',
                        }
                    }
                }, '"image_name" is required', done);
            });

            it('Non-string image name', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'build',
                            'image_name': []
                        }
                    }
                }, '"image_name" must be a string', done);
            });

            it('Image name on non-build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'git-clone',
                            'repo':       'jim',
                            'image_name': 'github.com/owner/repo'
                        }
                    }
                }, '"image_name" is not allowed', done);
            });

            it('Non-string Dockerfile', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'build',
                            'image_name': 'jim',
                            'dockerfile': []
                        }
                    }
                }, '"dockerfile" must be a string', done);
            });

            it('Dockerfile on non-build step', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'git-clone',
                            'repo':       'jim',
                            'dockerfile': 'jim'
                        }
                    }
                }, '"dockerfile" is not allowed', done);
            });

            it('Non-array build arguments', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':            'build',
                            'image_name':      'jim',
                            'build_arguments': ''
                        }
                    }
                }, '"build_arguments" must be an array', done);
            });

            it('Non-string build arguments', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':            'build',
                            'image_name':      'jim',
                            'build_arguments': [{}, 'asdasd']
                        }
                    }
                }, '"0" must be a string', done);
            });
        });

        describe('Push step attributes', () => {

            it('Non-existing candidate', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type: 'push',
                        }
                    }
                }, '"candidate" is required', done);
            });

            it('Non-string candidate', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type:      'push',
                            candidate: []
                        }
                    }
                }, '"candidate" must be a string', done);
            });

            it('Candidate on non-push step', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'build',
                            'image_name': 'jim',
                            'candidate':  'github.com/owner/repo'
                        }
                    }
                }, '"candidate" is not allowed', done);
            });

            it('Non-string registry', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            type:      'push',
                            candidate: 'imageId',
                            registry:  []
                        }
                    }
                }, '"registry" must be a string', done);
            });

            it('Registry on non-push step', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':       'build',
                            'image_name': 'jim',
                            'candidate':  'wowwww'
                        }
                    }
                }, '"candidate" is not allowed', done);
            });
        });

        describe('Composition step attributes', () => {
            it('No composition', (done) => {

                validateForError({
                    version: '1.0',
                    steps:   {
                        jim: {
                            'type':                   'composition',
                            'composition_variables':  ['meow=wuff'],
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
                    steps:   {
                        jim: {
                            'type':                  'composition',
                            'composition':           {
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
                    steps:   {
                        jim: {
                            'type':                  'composition',
                            'composition':           {},
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
                    steps:   {
                        jim: {
                            'type':                  'composition',
                            'composition':           {},
                            'composition_candidates': {
                                jim: 'bob'
                            },
                            'composition_variables': [{}, '']
                        }
                    }
                }, '"0" must be a string', done);
            });
        });
    });

    describe('Complete descriptor', () => {
        it('Minimal', (done) => {
            validate({
                version: '1.0',
                steps:   {
                    free:                      {
                        image: 'image/id',
                    },
                    clone:                     {
                        type: 'git-clone',
                        repo: 'github.com/owner/repo'
                    },
                    build:                     {
                        'type':       'build',
                        'image_name': 'teh-image'
                    },
                    push:                      {
                        type:      'push',
                        candidate: 'teh-image'
                    },
                    composition:               {
                        type:        'composition',
                        composition: {},
                        'composition_candidates': {
                            jim: 'bob'
                        }
                    },
                    string_composition:        {
                        type:        'composition',
                        composition: 'path/to/composition',
                        'composition_candidates': {
                            jim: 'bob'
                        }
                    },
                    composition_launch:        {
                        type:        'launch-composition',
                        composition: {}
                    },
                    string_composition_launch: {
                        type:        'launch-composition',
                        composition: 'path/to/composition'
                    }
                }
            });
            done();
        });
        it('Full old compatibility format', (done) => {
            validate({
                version: '1.0',
                steps:   {
                    free:        {
                        'description':       'desc',
                        'image':             'image/id',
                        'working-directory': 'working/dir',
                        'commands':          ['jim', 'bob'],
                        'environment':       ['key=value', 'key1=value¡'],
                        'fail-fast':         true,
                        'when':              { branch: { only: ['master'] } }
                    },
                    clone:       {
                        'type':              'git-clone',
                        'description':       'desc',
                        'working-directory': 'working/dir',
                        'repo':              'github.com/owner/repo',
                        'revision':          'abcdef12345',
                        'credentials':       { username: 'subject', password: 'credentials' },
                        'fail-fast':         true,
                        'when':              { branch: { ignore: ['develop'] } }
                    },
                    build:       {
                        'type':              'build',
                        'description':       'desc',
                        'working-directory': 'working/dir',
                        'dockerfile':        'path/to/dockerfile',
                        'image-name':        'teh-image',
                        'tag':               'develop',
                        'build-arguments':   ['jim=bob'],
                        'fail-fast':         true,
                        'when':              { condition: { all: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } }
                    },
                    push:        {
                        'type':        'push',
                        'description': 'desc',
                        'candidate':   'teh-image',
                        'tag':         'develop',
                        'registry':    'dtr.host.com',
                        'credentials': { username: 'subject', password: 'credentials' },
                        'fail-fast':   true,
                        'when':        { branch: { only: ['/FB-/i'] } }
                    },
                    composition: {
                        'type':                   'composition',
                        'description':            'desc',
                        'working-directory':      'working/dir',
                        'composition':            {
                            version:  '2',
                            services: { db: { image: 'postgres' } }
                        },
                        'composition-candidates': {
                            'test-service': {
                                image:   '${{from-step}}',
                                command: 'gulp lint'
                            }
                        },
                        'composition-variables':  ['jim=bob'],
                        'fail-fast':              true,
                        'when':                   { condition: { any: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } }
                    }
                }
            });
            done();
        });

        it('Full new format', (done) => {
            validate({
                version: '1.0',
                steps:   {
                    free:        {
                        'description':       'desc',
                        'title':             'Freestyle step',
                        'image':             'image/id',
                        'working_directory': 'working/dir',
                        'commands':          ['jim', 'bob'],
                        'environment':       ['key=value', 'key1=value¡'],
                        'fail_fast':         true,
                        'when':              { branch: { only: ['master'] } }
                    },
                    clone:       {
                        'type':              'git-clone',
                        'description':       'desc',
                        'title':             'Git clone step',
                        'working_directory': 'working/dir',
                        'repo':              'github.com/owner/repo',
                        'revision':          'abcdef12345',
                        'credentials':       { username: 'subject', password: 'credentials' },
                        'fail_fast':         true,
                        'when':              { branch: { ignore: ['develop'] } }
                    },
                    build:       {
                        'type':              'build',
                        'description':       'desc',
                        'title':             'Build step',
                        'working_directory': 'working/dir',
                        'dockerfile':        'path/to/dockerfile',
                        'image_name':        'teh-image',
                        'tag':               'develop',
                        'build_arguments':   ['jim=bob'],
                        'fail_fast':         true,
                        'when':              { condition: { all: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } }
                    },
                    push:        {
                        'type':        'push',
                        'description': 'desc',
                        'title':       'Push step',
                        'candidate':   'teh-image',
                        'tag':         'develop',
                        'registry':    'dtr.host.com',
                        'credentials': { username: 'subject', password: 'credentials' },
                        'fail_fast':   true,
                        'when':        { branch: { only: ['/FB-/i'] } }
                    },
                    composition: {
                        'type':                   'composition',
                        'description':            'desc',
                        'title':                  'Composition step',
                        'working_directory':      'working/dir',
                        'composition':            {
                            version:  '2',
                            services: { db: { image: 'postgres' } }
                        },
                        'composition_candidates': {
                            'test-service': {
                                image:   '${{from-step}}',
                                command: 'gulp lint'
                            }
                        },
                        'composition_variables':  ['jim=bob'],
                        'fail_fast':              true,
                        'when':                   { condition: { any: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } }
                    }
                }
            });
            done();
        });

        it('Use internal schema properties', (done) => {
            validate({
                version: '1.0',
                steps:   {
                    free:               {
                        'description':       'desc',
                        'title':             'Freestyle step',
                        'image':             'image/id',
                        'working_directory': 'working/dir',
                        'commands':          ['jim', 'bob'],
                        'environment':       ['key=value', 'key1=value¡'],
                        'fail_fast':         true,
                        'when':              { branch: { only: ['master'] } },
                        'create_file':       'yes'
                    },
                    composition:        {
                        'type':                           'composition',
                        'description':                    'desc',
                        'title':                          'Composition step',
                        'working_directory':              'working/dir',
                        'composition':                    {
                            version:  '2',
                            services: { db: { image: 'postgres' } }
                        },
                        'composition_candidates':         {
                            'test-service': {
                                image:   '${{from-step}}',
                                command: 'gulp lint'
                            }
                        },
                        'composition_variables':          ['jim=bob'],
                        'fail_fast':                      true,
                        'when':                           { condition: { any: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } },
                        'add_flow_volume_to_composition': true,
                        'environment_name':               'moo',
                        'entry_point':                    'jim',
                        assets:                           'bob',
                        'create_file':                    'yes'
                    },
                    composition_launch: {
                        'type':                           'launch-composition',
                        'description':                    'desc',
                        'title':                          'Composition step',
                        'working_directory':              'working/dir',
                        'composition':                    {
                            version:  '2',
                            services: { db: { image: 'postgres' } }
                        },
                        'composition_variables':          ['jim=bob'],
                        'fail_fast':                      true,
                        'when':                           { condition: { any: { noDetectedSkipCI: 'includes(\'${{CF_COMMIT_MESSAGE}}\', \'[skip ci]\') == false' } } },
                        'add_flow_volume_to_composition': true,
                        'environment_name':               'moo',
                        'entry_point':                    'jim',
                        assets:                           'bob',
                        'create_file':                    'yes'
                    }
                }
            });
            done();
        });
    });
});
