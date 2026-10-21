export function pixelScale(fit: number, devicePixelRatio: number): number {
    const devicePixels = fit * devicePixelRatio;
    return devicePixels >= 2 ? Math.floor(devicePixels) / devicePixelRatio : fit;
}
