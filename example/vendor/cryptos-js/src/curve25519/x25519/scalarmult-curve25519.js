import { montgomeryLadder } from './montgomery-ladder.js';
import { fe25519 } from "../fe25519/fe25519.js";
import { fe25519FromBytes } from "../fe25519/fe25519-from-bytes.js";

export function scalarmultCurve25519(scalarBytes, ubytes) {
    const scalar = fe25519();
    fe25519FromBytes(scalar, scalarBytes);
    scalar.value &= (1n << 255n) - 1n;
    scalar.value &= ~7n;
    scalar.value |= 1n << 254n;
    const u = fe25519();
    fe25519FromBytes(u, ubytes);
    return montgomeryLadder(scalar.value, u);
}