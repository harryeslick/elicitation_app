
import { BetaParams } from '../types';

// More robust log-gamma function to avoid numerical overflow
function logGamma(z: number): number {
    // Lanczos approximation for log(gamma(z))
    const g = 7;
    const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
              771.32342877765313, -176.61502916214059, 12.507343278686905,
              -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    
    if (z < 0.5) {
        // Use reflection formula: Γ(z)Γ(1-z) = π/sin(πz)
        return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    }
    
    z -= 1;
    let x = C[0];
    for (let i = 1; i < C.length; i++) {
        x += C[i] / (z + i);
    }
    
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function logBeta(alpha: number, beta: number): number {
    return logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta);
}

export function calculateBetaParams(mode: number, confidence: number): BetaParams {
    // Clamp mode to avoid issues at 0 or 1
    const m = Math.max(0.01, Math.min(0.99, mode));
    
    // Use a more moderate mapping for confidence to avoid extreme parameter values
    // This prevents numerical instability while still giving meaningful shape differences
    const kappa = 4 + (confidence / 100) * 20; // Reduced from 50 to 20 for better stability
    
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
        return Array(numPoints).fill(0).map((_, i) => ({ x: min + (max - min) * i / (numPoints - 1), y: 0 }));
    }
    
    // Use log-based calculation to avoid numerical overflow/underflow
    const logB = logBeta(alpha, beta);
    if (!isFinite(logB)) {
        return Array(numPoints).fill(0).map((_, i) => ({ x: min + (max - min) * i / (numPoints - 1), y: 0 }));
    }

    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const x_norm = i / (numPoints - 1);
        // Avoid calculating at the exact boundaries where it can be problematic
        const x_safe = Math.max(1e-6, Math.min(1 - 1e-6, x_norm));

        // Calculate PDF using log space to avoid overflow
        const logPdf = (alpha - 1) * Math.log(x_safe) + (beta - 1) * Math.log(1 - x_safe) - logB;
        const y_norm = Math.exp(logPdf);

        // Check for valid results
        if (!isFinite(y_norm) || y_norm < 0) {
            points.push({
                x: min + x_norm * range,
                y: 0
            });
        } else {
            points.push({
                x: min + x_norm * range,
                y: y_norm / range, // Scale PDF to the new range
            });
        }
    }

    return points;
}
