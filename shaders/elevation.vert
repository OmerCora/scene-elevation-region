// Vertex shader — treats the painted elevation grid as a shallow projected
// heightfield. Raised vertices shift along the camera direction; transition
// vertices also spread along the elevation gradient to form automatic ramps.

precision mediump float;

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute float aElevation;
attribute float aRelief;
attribute vec2 aGradient;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec2 uCameraFocus;   // mesh-local coordinates
uniform vec2 uMeshSize;      // mesh-local scene rect size
uniform float uEdgeFeather;  // pixels over which displacement fades to zero
uniform float uParallax;     // strength (e.g. 0.05 / 0.10 / 0.20)

varying vec2 vTextureCoord;
varying vec2 vLocalPosition;
varying float vElevation;
varying float vRelief;
varying vec2 vGradient;

void main(void) {
    float signedHeight = clamp(aElevation / 8.0, -1.0, 1.0);

    // Edge fade in mesh space so displaced height never pushes geometry off
    // the scene rectangle.
    vec2 edgeDist = min(aVertexPosition, uMeshSize - aVertexPosition);
    float edgeFade = smoothstep(0.0, max(uEdgeFeather, 1.0), min(edgeDist.x, edgeDist.y));

    // Directional height projection. This is intentionally not radial scaling:
    // high ground shifts as a single shallow surface, while the lower adjacent
    // ground stays anchored. The stretched triangles between them read as ramps.
    vec2 focusOffset = uCameraFocus - (uMeshSize * 0.5);
    vec2 viewDir = length(focusOffset) > 1.0 ? normalize(focusOffset) : normalize(vec2(-0.45, -0.90));
    float heightPixels = signedHeight * uParallax * uEdgeFeather * 3.4 * edgeFade;

    // Small local spread along the height gradient makes raised plateaus/pits
    // feel magnified without blowing the whole map outward from the screen.
    float gradLen = length(aGradient);
    vec2 gradDir = gradLen > 0.0001 ? aGradient / gradLen : vec2(0.0);
    vec2 rampSpread = gradDir * signedHeight * aRelief * uParallax * uEdgeFeather * 1.45 * edgeFade;

    vec2 displaced = aVertexPosition + (viewDir * heightPixels) + rampSpread;

    vec3 pos = translationMatrix * vec3(displaced, 1.0);
    gl_Position = vec4((projectionMatrix * pos).xy, 0.0, 1.0);

    // Pass the *original* (undisplaced) local position so the fragment shader
    // shading and edge-fade stay anchored to the painted elevation grid.
    vTextureCoord = aTextureCoord;
    vLocalPosition = aVertexPosition;
    vElevation = aElevation;
    vRelief = aRelief;
    vGradient = aGradient;
}
