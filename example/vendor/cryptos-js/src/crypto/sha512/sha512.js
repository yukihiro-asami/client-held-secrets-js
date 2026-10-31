import { sha512State } from './sha512-state.js';
import { sha512Init } from './sha512-init.js';
import { sha512Update } from './sha512-update.js';
import { sha512Final } from './sha512-final.js';

export function sha512(input, output) {
    const state = sha512State();
    sha512Init(state);
    sha512Update(state, input);
    sha512Final(state, output);
}
