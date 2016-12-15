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

    getSchema() {
        let gitCloneProperties = {
            type:                Joi.string().valid(GitClone.getType()),
            'working_directory': Joi.string(),
            repo:                Joi.string().required(),
            revision:            Joi.string(),
            credentials:         BaseSchema._getCredentialsSchema()
        };
        return this._createSchema(gitCloneProperties);
    }

    _applyStepCompatibility(schema) {
        return schema.rename('working-directory', 'working_directory', {ignoreUndefined: true});
    }
}
// Exported objects/methods
module.exports = GitClone;