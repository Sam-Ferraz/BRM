declare const _default: {
    preset: string;
    testEnvironment: string;
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': string;
    };
    transform: {
        '^.+\\.ts$': string;
    };
    testMatch: string[];
    collectCoverageFrom: string[];
};
export default _default;
