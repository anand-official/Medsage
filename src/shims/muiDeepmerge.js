import * as deepmergeModule from '../../node_modules/@mui/utils/deepmerge/deepmerge.js';

const deepmerge = deepmergeModule.default || deepmergeModule;

export const isPlainObject = deepmergeModule.isPlainObject;
export default deepmerge;

