/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions,no-template-curly-in-string */

'use strict';

const chai = require('chai');

const { expect }    = chai;
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

const Validator = require('../validator');

function validate(model) {
    return Validator.validate(model);
}

function validateForError(model, expectedError, done) {
    try {
        validate(model);
        done(new Error('Validation should have failed'));
    } catch (e) {
        e.details.forEach((det, index) => {
            expect(det.message).to.equal(expectedError.details[index]);
        });
        done();
    }
}

describe('Validate Codefresh YAML', () => {


    describe('Steps', () => {

        describe('Build', () => {
            it('Should suggest title argument', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'build',
                                image_name: 'codefresh/cf-docker-tag-pusher',
                                titl: 'Title'
                            }

                        }
                    },
                    {
                        details: [
                            '"titl" is not allowed. Did you mean "title"?'
                        ]
                    }, done);
            });

            it('Should not suggest title when argument longer then threshold', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'build',
                                image_name: 'codefresh/cf-docker-tag-pusher',
                                titleaaa: 'Title'
                            }

                        }
                    },
                    {
                        details: [
                            '"titleaaa" is not allowed'
                        ]
                    }, done);
            });

            it('Should not suggest when argument shorter then threshold', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'build',
                                image_name: 'codefresh/cf-docker-tag-pusher',
                                ing_directory: 'Title'
                            }

                        }
                    },
                    {
                        details: [
                            '"ing_directory" is not allowed'
                        ]
                    }, done);
            });

            it('Should suggest when there are less errors than threshold', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'build',
                                image_name: 'codefresh/cf-docker-tag-pusher',
                                warcing_derektory: 'Title'
                            }

                        }
                    },
                    {
                        details: [
                            '"warcing_derektory" is not allowed. Did you mean "working_directory"?'
                        ]
                    }, done);
            });

            it('Should not suggest when there are more errors than threshold', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'build',
                                image_name: 'codefresh/cf-docker-tag-pusher',
                                warcing_derektori: 'Title'
                            }

                        }
                    },
                    {
                        details: [
                            '"warcing_derektori" is not allowed'
                        ]
                    }, done);
            });

            it('Should suggest closest existing argument when it is a beginning part of known arguments', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'build',
                                image_name: 'codefresh/cf-docker-tag-pusher',
                                working_dir: 'Title'
                            }

                        }
                    },
                    {
                        details: [
                            '"working_dir" is not allowed. Did you mean "working_directory"?'
                        ]
                    }, done);
            });

            it('Should suggest image_name argument', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'build',
                                image_nam: 'codefresh/cf-docker-tag-pusher',
                            }

                        }
                    },
                    {
                        details: [
                            '"image_name" is required',
                            '"image_nam" is not allowed. Did you mean "image_name"?'
                        ]
                    }, done);
            });

            it('Should not suggest candidate argument', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'build',
                                image_name: 'codefresh/cf-docker-tag-pusher',
                                candidate: 'alpine'
                            }

                        }
                    },
                    {
                        details: [
                            '"candidate" is not allowed'
                        ]
                    }, done);
            });
        });


        describe('Push', () => {
            it('Should suggest candidate argument', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'push',
                                condidate: 'codefresh/cf-docker-tag-pusher',
                            }

                        }
                    },
                    {
                        details: [
                            '"candidate" is required',
                            '"condidate" is not allowed. Did you mean "candidate"?'
                        ]
                    }, done);
            });

            it('Should not suggest dockerfile argument', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'push',
                                dockerfile: 'codefresh/cf-docker-tag-pusher',
                                candidate: 'alpine'
                            }

                        }
                    },
                    {
                        details: [
                            '"dockerfile" is not allowed'
                        ]
                    }, done);
            });
        });


        describe('Pending approval', () => {
            it('Should suggest title when git argument written', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'pending-approval',
                                git: 'github'
                            }

                        }
                    },
                    {
                        details: [
                            '"git" is not allowed. Did you mean "title"?'
                        ]
                    }, done);
            });

            it('Should suggest retry when repo argument written', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'pending-approval',
                                repo: 'github'
                            }

                        }
                    },
                    {
                        details: [
                            '"repo" is not allowed. Did you mean "retry"?'
                        ]
                    }, done);
            });


            it('Should suggest timeout when repo argument written', (done) => {
                validateForError(
                    {
                        version: '1.0',
                        steps: {
                            pstep_name: {
                                type: 'pending-approval',
                                repo: 'github'
                            }

                        }
                    },
                    {
                        details: [
                            '"repo" is not allowed. Did you mean "retry"?'
                        ]
                    }, done);
            });
        });
    });

});
