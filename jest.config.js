export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^.*/supabase$': '<rootDir>/__mocks__/supabase.js',
    '^.*/supabase.js$': '<rootDir>/__mocks__/supabase.js',
    '^../../src/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^../src/pages/(.*)$': '<rootDir>/src/pages/$1',
  },
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
}