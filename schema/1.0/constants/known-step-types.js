'use strict';

/**
 * This is a closed list of step types that are known to the Planner and processed in a special way.
 * All other step types are treated as "custom typed steps".
 */
const KNOWN_STEP_TYPES = [
    'git-clone',
    'build',
    'deploy',
    'composition',
    'launch-composition',
    'parallel',
    'push',
    'travis',
    'simple_travis',
    'integration-test',
    'push-tag',
    'pending-approval',
    'services',
    'freestyle',
    'freestyle-ssh',
    'github-action',
];

module.exports = {
    KNOWN_STEP_TYPES,
};
