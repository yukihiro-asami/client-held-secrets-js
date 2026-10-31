import { INITIAL_STATE } from '../const.js';
export function sha512Init(state) {
    for (let i = 0; i < 8; i++) {
        state.state[i].value = INITIAL_STATE[i];
    }
}