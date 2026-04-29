precision mediump float;

varying vec2 vTextureCoord;
varying vec2 vLocalPosition;
varying float vElevation;
varying float vRelief;
varying vec2 vGradient;

uniform sampler2D uSampler;
uniform float uAlpha;
uniform vec2 uCameraFocus;
uniform vec2 uMeshSize;
uniform float uEdgeFeather;
uniform float uParallax;

void main(void) {
    float signedHeight = clamp(vElevation / 8.0, -1.0, 1.0);
    float absHeight = abs(signedHeight);

    // Per-vertex elevation gradient (computed CPU-side, interpolated here).
    float slopeMag = length(vGradient);
    vec2 slopeDir = slopeMag > 0.0001 ? vGradient / slopeMag : vec2(0.0);

    // Auto-ramp band: based on local height change, not absolute altitude.
    float ramp = smoothstep(0.08, 0.42, vRelief);

    // Full-opacity texture magnification. Elevated plateaus sample slightly
    // toward the camera focus so the map art appears closer; pits sample away.
    // Because this mesh replaces the background, this cannot create white burn.
    vec2 safeSize = max(uMeshSize, vec2(1.0));
    vec2 focusUV = clamp(uCameraFocus / safeSize, vec2(0.0), vec2(1.0));
    float plateau = absHeight * (1.0 - ramp);
    vec2 uvMagnify = (focusUV - vTextureCoord) * signedHeight * uParallax * (0.42 + plateau * 0.62);
    vec2 sampledUV = clamp(vTextureCoord + uvMagnify, vec2(0.0), vec2(1.0));
    vec4 color = texture2D(uSampler, sampledUV);

    // Camera direction at this fragment. The same direction also drives vertex
    // height projection, so ramp shadows line up with the perceived parallax.
    vec2 toCamera = uCameraFocus - vLocalPosition;
    float toCamLen = length(toCamera);
    vec2 toCamDir = toCamLen > 0.0001 ? toCamera / toCamLen : normalize(vec2(-0.45, -0.90));

    // Slopes facing away from the camera receive most of the shading. Slopes
    // facing the camera get only a tiny lift, deliberately capped to avoid the
    // white-burn look.
    float facing = dot(slopeDir, toCamDir) * sign(signedHeight + 0.0001);
    float lee = clamp(-facing, 0.0, 1.0);
    float crest = clamp(facing, 0.0, 1.0);

    // Contact shadow: low/neutral pixels inside a steep ramp darken, creating
    // the visual read of a raised lip or dropped trench without a bright halo.
    float lowSide = 1.0 - smoothstep(0.04, 0.34, absHeight);
    float contact = ramp * lowSide;

    vec3 shaded = color.rgb;
    shaded *= 1.0 - (ramp * lee * 0.46);
    shaded *= 1.0 - (contact * 0.36);

    // Very restrained crest lift. This is proportional to the source color,
    // not an additive white overlay, so bright map art cannot blow out.
    shaded = mix(shaded, min(color.rgb * 1.08, vec3(0.96)), ramp * crest * 0.18);

    // Flat high/low ground should remain mostly the original scene art. A tiny
    // contrast shift is enough to separate plateaus from untouched terrain.
    shaded *= 1.0 - plateau * 0.035;

    gl_FragColor = vec4(shaded, color.a * uAlpha);
}
