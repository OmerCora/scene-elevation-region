// Vertex shader — displaces each vertex outward from the camera focus by
// elevation * parallax strength. UVs are unchanged so the texture is sampled
// from its original layout, producing a magnified / parallaxed silhouette.

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute float aElevation;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec2 uCameraFocus;   // in mesh-local coordinates
uniform float uParallax;     // strength (e.g. 0.05 / 0.10 / 0.20)

varying vec2 vTextureCoord;

void main(void) {
    vec2 displaced = aVertexPosition + (aVertexPosition - uCameraFocus) * (aElevation * uParallax);
    vec3 pos = translationMatrix * vec3(displaced, 1.0);
    gl_Position = vec4((projectionMatrix * pos).xy, 0.0, 1.0);
    vTextureCoord = aTextureCoord;
}
