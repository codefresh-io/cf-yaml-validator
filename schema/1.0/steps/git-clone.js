/**
 * Defines the git clone step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi        = require('joi');
const BaseSchema = require('./../base-schema');

class GitClone extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'git-clone';
    }

    static getSchema() {
        const gitCloneSchema = {
            type:                Joi.string().valid(GitClone.getType()),
            'working-directory': Joi.string(),
            repo:                Joi.string().required(),
            revision:            Joi.string(),
            credentials:         BaseSchema._getCredentialsSchema()
        };
        return Object.assign(gitCloneSchema, BaseSchema._commonSchema());
    }
}
// Exported objects/methods
module.exports = GitClone;