
import { BetaParams } from '../types';

// Using a pre-calculated table for the gamma function for simplicity and performance.
// This avoids including a large math library.
const GAMMA_CACHE: { [key: number]: number } = {
    0.5: 1.7724538509055159,
    1: 1, 1.5: 0.8862269254527579, 2: 1, 2.5: 1.329340388179137, 3: 2, 3.5: 3.323350970447842,
    4: 6, 4.5: 11.631728396567428, 5: 24, 5.5: 46.52691358626971, 6: 120, 6.5: 209.3711111382137,
    7: 720, 7.5: 1046.8555556910685, 8: 5040, 8.5: 5757.705556300876, 9: 40320,
    9.5: 34546.23333780526, 10: 362880
};

function gamma(n: number): number {
    if (GAMMA_CACHE[n]) return GAMMA_CACHE[n];
    if (n > 10) return Math.sqrt(2 * Math.PI / n) * Math.pow((n / Math.E), n); // Stirling's approximation
    if (n === 0) return Infinity;
    if (n < 0) return NaN;
    let g = 1;
    while (n > 1) {
        n--;
        g *= n;
    }
    return g;
}

function betaFunction(alpha: number, beta: number): number {
    return (gamma(alpha) * gamma(beta)) / gamma(alpha + beta);
}

export function calculateBetaParams(mode: number, confidence: number): BetaParams {
    // Clamp mode to avoid issues at 0 or 1
    const m = Math.max(0.001, Math.min(0.999, mode));
    
    // The confidence slider (1-100) is mapped to kappa (alpha + beta).
    // A higher confidence leads to a larger kappa, resulting in a more concentrated (peaked) distribution.
    // We start kappa at 4 to ensure alpha and beta are > 1, giving a unimodal distribution.
    const kappa = 4 + (confidence / 100) * 50; 
    
    const alpha = m * (kappa - 2) + 1;
    const beta = (1 - m) * (kappa - 2) + 1;
    
    return { alpha, beta };
}

export function getBetaPdfPoints(min: number, max: number, mode: number, confidence: number, numPoints: number = 101): { x: number, y: number }[] {
    if (min >= max) return Array(numPoints).fill(0).map((_, i) => ({ x: min + (max - min) * i / (numPoints - 1), y: 0 }));

    const range = max - min;
    const scaledMode = (mode - min) / range;
    
    const { alpha, beta } = calculateBetaParams(scaledMode, confidence);

    if (alpha <= 0 || beta <= 0 || isNaN(alpha) || isNaN(beta)) {
        return [];
    }
    
    const B = betaFunction(alpha, beta);
    if (B === 0 || !isFinite(B)) return [];

    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const x_norm = i / (numPoints - 1);
        // Avoid calculating at the exact boundaries where it can be infinity for certain alpha/beta values
        const x_safe = Math.max(1e-6, Math.min(1 - 1e-6, x_norm));

        const y_norm = (Math.pow(x_safe, alpha - 1) * Math.pow(1 - x_safe, beta - 1)) / B;

        points.push({
            x: min + x_norm * range,
            y: y_norm / range, // Scale PDF to the new range
        });
    }

    return points;
}
