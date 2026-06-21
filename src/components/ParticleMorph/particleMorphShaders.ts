export const particleMorphVertexShader = /* glsl */ `
  attribute vec3 aSrc;
  attribute vec3 aDst;
  attribute float aSeed;
  attribute float aSize;

  uniform float uTime;
  uniform float uProgress;
  uniform vec3 uMouse;
  uniform float uPxRatio;

  varying float vAlpha;
  varying float vProgress;
  varying float vSeed;

  void main() {
    vSeed = aSeed;

    // Per-particle stagger so the morph sweeps in (face side first)
    float xNorm = (aSrc.x + 8.0) / 16.0;
    float stagger = aSeed * 0.18 + xNorm * 0.15;
    float localP = clamp((uProgress - stagger) / (1.0 - stagger + 0.001), 0.0, 1.0);
    float ep = localP * localP * (3.0 - 2.0 * localP);
    vProgress = ep;

    float wAmt = 1.0 - ep;
    float t = uTime;

    // ── RIVER FLOW: strong traveling waves before morph ──
    float wave1 = sin(aSrc.x * 1.35 - t * 1.15 + aSeed * 1.8) * 0.34;
    float wave2 = sin(aSrc.x * 2.8 - t * 1.65 + aSrc.y * 0.75) * 0.16;
    float wave3 = cos(aSrc.y * 1.9 + t * 0.85 + aSeed * 4.2) * 0.10;
    float wave4 = sin(t * 0.55 + aSrc.x * 0.45 + aSeed * 9.0) * 0.08;
    float wy = wave1 + wave2 + wave3;

    float wx = cos(aSrc.x * 0.85 - t * 0.95 + aSeed * 3.1) * 0.14
             + sin(t * 0.65 + aSeed * 6.28) * 0.09
             + wave4;

    // Idle wave field — grains drift like water until morph takes over
    vec3 wavePos = vec3(
      aSrc.x + wx * wAmt,
      aSrc.y + wy * wAmt,
      aSrc.z
    );

    vec3 pos = mix(wavePos, aDst, ep);

    // Subtle shimmer once locked into the shape
    pos.x += sin(t * 2.0 + aSeed * 12.0) * 0.004 * ep;

    // Mouse repel
    vec3 toMouse = pos - uMouse;
    float mDist = length(toMouse.xy);
    float repelR = 0.7;
    if (mDist < repelR && mDist > 0.001) {
      float str = (1.0 - mDist / repelR) * 0.4;
      pos.xy += normalize(toMouse.xy) * str;
    }

    // ── POINT SIZE: small, crisp grains ──
    float headSize = 0.85 + aSeed * 0.45;
    float sz = mix(aSize, headSize, ep);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = sz * uPxRatio * (78.0 / -mv.z);

    // Alpha: clearer / more opaque than before
    float waveAlpha = 0.5 + aSeed * 0.4;
    float headAlpha = 0.9 + aSeed * 0.1;
    vAlpha = mix(waveAlpha, headAlpha, ep);
  }
`;

export const particleMorphFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vProgress;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);

    // Crisp round dot with a tight anti-aliased edge
    float circle = 1.0 - smoothstep(0.4, 0.5, d);
    if (circle <= 0.0) discard;

    // Site palette: dim lavender wave -> bright accent (#c2a4ff) when morphed
    vec3 waveCol = vec3(0.5, 0.42, 0.68);
    vec3 headCol = vec3(0.8, 0.68, 1.0);

    vec3 col = mix(waveCol, headCol, vProgress);
    col *= 0.85 + vSeed * 0.3;

    gl_FragColor = vec4(col, vAlpha * circle);
  }
`;
