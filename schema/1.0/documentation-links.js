'use strict';

const docBaseUrl = process.env.DOCS_BASE_URL || 'https://codefresh.io/docs/docs/codefresh-yaml/steps';

const DocumentationLinks = {
    'freestyle': `${docBaseUrl}/freestyle/`,
    'build': `${docBaseUrl}/build/`,
    'push': `${docBaseUrl}/push/`,
    'deploy': `${docBaseUrl}/deploy/`,
    'git-clone': `${docBaseUrl}/git-clone/`,
    'launch-composition': `${docBaseUrl}/launch-composition/`,
    'pending-approval': `${docBaseUrl}/approval/`,
    'composition': `${docBaseUrl}/composition/`,
};

const IntegrationLinks = {
    'git-clone': `https://codefresh.io/docs/docs/integrations/git-providers/`,
    'deploy': `https://codefresh.io/docs/docs/deploy-to-kubernetes/add-kubernetes-cluster/`,
    'push': `https://codefresh.io/docs/docs/docker-registries/external-docker-registries/`,
    'build': `https://codefresh.io/docs/docs/docker-registries/external-docker-registries/`,
    'composition': `https://codefresh.io/docs/docs/docker-registries/external-docker-registries/`,
    'freestyle': `https://codefresh.io/docs/docs/docker-registries/external-docker-registries/`,
    'helm': 'https://codefresh.io/docs/docs/new-helm/helm2-support',
    'variables': 'https://codefresh.io/docs/docs/codefresh-yaml/variables/'
};
module.exports = { docBaseUrl, DocumentationLinks, IntegrationLinks };
