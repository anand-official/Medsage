module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/server'],
    testMatch: [
        '**/__tests__/**/*.test.js',
    ],
    clearMocks: true,
    collectCoverageFrom: [
        'server/**/*.js',
        '!server/**/__tests__/**',
        '!server/scripts/**',
        '!server/data/**',
    ],
    coverageThreshold: {
        global: {
            lines:     40,
            functions: 40,
            branches:  30,
        },
    },
};
