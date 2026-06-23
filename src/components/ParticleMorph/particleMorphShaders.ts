export const particleMorphVertexShader = /* glsl */ `
  attribute vec3 aSrc;
  attribute vec3 aDst;
  attribute float aSeed;
  attribute float aSize;
  attribute vec3 aTargetCol;
  attribute float aTargetWeight;
  attribute vec2 aJitter;
  attribute float aCellArea;

  uniform float uTime;
  uniform float uProgress;
  uniform vec3 uMouse;
  uniform float uPxRatio;

  varying float vAlpha;
  varying float vProgress;
  varying float vSeed;
  varying vec3 vTargetCol;
  varying float vDarkness;

  void main() {
    vSeed = aSeed;
    vTargetCol = aTargetCol;
    vDarkness = aTargetWeight;

    float distNorm = length(aDst.xy) / 7.5;
    float stagger = aSeed * 0.16 + distNorm * 0.24;
    float localP = clamp((uProgress - stagger) / (1.0 - stagger + 0.001), 0.0, 1.0);
    float ep = localP * localP * (3.0 - 2.0 * localP);
    vProgress = ep;

    float wAmt = 1.0 - ep;
    float locked = step(0.98, uProgress);
    float t = uTime;

    float wave1 = sin(aSrc.x * 1.35 - t * 1.15 + aSeed * 1.8) * 0.34;
    float wave2 = sin(aSrc.x * 2.8 - t * 1.65 + aSrc.y * 0.75) * 0.16;
    float wave3 = cos(aSrc.y * 1.9 + t * 0.85 + aSeed * 4.2) * 0.10;
    float wave4 = sin(t * 0.55 + aSrc.x * 0.45 + aSeed * 9.0) * 0.08;
    float wy = wave1 + wave2 + wave3;

    float wx = cos(aSrc.x * 0.85 - t * 0.95 + aSeed * 3.1) * 0.14
             + sin(t * 0.65 + aSeed * 6.28) * 0.09
             + wave4;

    vec3 wavePos = vec3(
      aSrc.x + wx * wAmt,
      aSrc.y + wy * wAmt,
      aSrc.z
    );

    vec3 pos = mix(wavePos, aDst, ep);

    // Jitter only during wave state — snaps to grid at full morph
    pos.xy += aJitter * wAmt;

    // Shimmer fades out; fully frozen when scroll-locked
    pos.x += sin(t * 2.0 + aSeed * 12.0) * 0.004 * ep * (1.0 - locked);

    // Mouse repel disabled at full morph
    vec3 toMouse = pos - uMouse;
    float mDist = length(toMouse.xy);
    float repelR = 0.7;
    if (mDist < repelR && mDist > 0.001 && locked < 0.5) {
      float str = (1.0 - mDist / repelR) * 0.4;
      pos.xy += normalize(toMouse.xy) * str;
    }

    // Gamma-corrected halftone sizing with area-based radius
    float weightGamma = pow(aTargetWeight, 0.7);
    float areaFactor = sqrt(max(aCellArea, 0.001)) * 0.18;
    float halftoneSize = 0.25 + weightGamma * 1.55 + areaFactor * weightGamma + aSeed * 0.06;
    float sz = mix(aSize, halftoneSize, ep);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = sz * uPxRatio * (78.0 / -mv.z);

    float waveAlpha = 0.5 + aSeed * 0.4;
    float headAlpha = 0.88 + aTargetWeight * 0.12;
    vAlpha = mix(waveAlpha, headAlpha, ep);
  }
`;

export const particleMorphFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vProgress;
  varying float vSeed;
  varying vec3 vTargetCol;
  varying float vDarkness;

  vec3 srgbToLinear(vec3 c) {
    vec3 lo = c / 12.92;
    vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(lo, hi, step(vec3(0.04045), c));
  }

  vec3 linearToSrgb(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }

  vec3 saturateColor(vec3 col, float amount) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    return mix(vec3(lum), col, amount);
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);

    // Softer halftone dots — gentle overlap in mid/dark tones
    float circle = 1.0 - smoothstep(0.35, 0.52, d);
    if (circle <= 0.0) discard;

    vec3 waveCol = vec3(0.42, 0.36, 0.72);
    vec3 waveAccent = vec3(0.55, 0.48, 0.88);
    vec3 waveTint = mix(waveCol, waveAccent, vSeed);
    waveTint *= 0.82 + vSeed * 0.28;

    // sRGB → linear for accurate mixing
    vec3 targetLin = srgbToLinear(vTargetCol);
    vec3 portraitCol = linearToSrgb(saturateColor(targetLin, 1.03));

    // At full morph, use exact source color — no tinting
    float exactMix = smoothstep(0.95, 1.0, vProgress);
    portraitCol = mix(portraitCol, vTargetCol, exactMix);

    vec3 col = mix(waveTint, portraitCol, vProgress);

    // Subtle contrast curve for print-like output
    col = pow(max(col, vec3(0.0)), vec3(0.92));

    // Boost density in shadows — compensates for sparse light-area dots
    float darkBoost = smoothstep(0.25, 0.85, vDarkness);
    float alpha = vAlpha * circle * (1.0 + darkBoost * 0.2);

    gl_FragColor = vec4(col * alpha, alpha);
  }
`;
