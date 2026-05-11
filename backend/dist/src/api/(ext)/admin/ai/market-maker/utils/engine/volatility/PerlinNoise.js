"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerlinNoise = void 0;
class PerlinNoise {
    constructor(seed) {
        this.permutation = this.generatePermutation(seed);
    }
    generatePermutation(seed) {
        const perm = [];
        for (let i = 0; i < 256; i++) {
            perm[i] = i;
        }
        let random = seed !== undefined ? this.seededRandom(seed) : Math.random;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        return [...perm, ...perm];
    }
    seededRandom(seed) {
        let state = seed;
        return () => {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };
    }
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    grad(hash, x) {
        const h = hash & 15;
        const grad = 1 + (h & 7);
        return (h & 8) !== 0 ? -grad * x : grad * x;
    }
    noise(x) {
        const xi = Math.floor(x) & 255;
        const xf = x - Math.floor(x);
        const u = this.fade(xf);
        const a = this.permutation[xi];
        const b = this.permutation[xi + 1];
        const gradA = this.grad(a, xf);
        const gradB = this.grad(b, xf - 1);
        return this.lerp(gradA, gradB, u) * 0.5;
    }
    octaveNoise(x, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            total += this.noise(x * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return total / maxValue;
    }
    turbulence(x, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            total += Math.abs(this.noise(x * frequency)) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return total / maxValue;
    }
    ridgedNoise(x, octaves = 4, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        let prevRidge = 1;
        for (let i = 0; i < octaves; i++) {
            const n = 1 - Math.abs(this.noise(x * frequency));
            const ridge = n * n * prevRidge;
            prevRidge = n;
            total += ridge * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return total / maxValue;
    }
    warpedNoise(x, warpStrength = 0.5) {
        const warp = this.noise(x + 100) * warpStrength;
        return this.noise(x + warp);
    }
    reseed(seed) {
        this.permutation = this.generatePermutation(seed);
    }
}
exports.PerlinNoise = PerlinNoise;
exports.default = PerlinNoise;
