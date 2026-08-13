#version 300 es
precision highp float;

/*
 * What a pinhole actually does to a scene.
 *
 * Every pixel of the back wall receives light from the whole scene *through
 * the hole*: the hole is a disc, so each wall point integrates a disc-shaped
 * patch of the world. That integral is this loop — not a blur filter chosen to
 * look about right.
 *
 * Two effects, convolved:
 *   - geometric: the disc of the hole, radius uGeoRadius. Grows with the hole.
 *   - diffraction: light bending at the rim, radius uDiffRadius. Grows as the
 *     hole SHRINKS, which is why "smaller is always sharper" is false and why
 *     a sweet spot exists at all.
 *
 * Light is summed in linear space and re-encoded at the end, so halving the
 * hole really does quarter the light instead of merely dimming the picture by
 * eye.
 */

uniform sampler2D uScene;
uniform float uGeoRadius;   // disc radius, in UV units
uniform float uDiffRadius;  // diffraction spread, in UV units
uniform float uExposure;    // 0–1, (d/d_max)^2, or 1 when the eye has adapted
uniform float uAspect;      // width / height, keeps the sampling disc circular
uniform int uSamples;

in vec2 vUv;
out vec4 fragColour;

const float GAMMA = 2.2;
const float GOLDEN_ANGLE = 2.39996323;
const int MAX_SAMPLES = 64;

vec3 toLinear(vec3 colour) {
  return pow(colour, vec3(GAMMA));
}

vec3 toDisplay(vec3 colour) {
  return pow(colour, vec3(1.0 / GAMMA));
}

void main() {
  // The image is turned through half a turn: top becomes bottom AND left
  // becomes right. One subtraction, and it is the whole lesson of the app.
  vec2 base = vec2(1.0) - vUv;

  vec2 anisotropy = vec2(1.0 / uAspect, 1.0);
  float samples = float(uSamples);

  vec3 sum = vec3(0.0);
  for (int i = 0; i < MAX_SAMPLES; i++) {
    if (i >= uSamples) break;
    float index = float(i) + 0.5;

    // Sunflower spiral: uniform coverage of the disc with no random numbers,
    // so the picture is stable frame to frame instead of shimmering.
    float radius = sqrt(index / samples);
    float angle = float(i) * GOLDEN_ANGLE;
    vec2 disc = vec2(cos(angle), sin(angle)) * radius;

    // A second, longer-tailed offset stands in for the Airy spread. Convolving
    // the two kernels is what makes the total blur behave as
    // sqrt(geometric^2 + diffraction^2), the curve optics.ts minimises.
    float tail = sqrt(max(0.0, -2.0 * log(index / (samples + 1.0)))) * 0.5;
    vec2 spread = vec2(cos(angle * 1.7), sin(angle * 1.7)) * tail;

    vec2 offset = (disc * uGeoRadius + spread * uDiffRadius) * anisotropy;
    sum += toLinear(texture(uScene, base + offset).rgb);
  }

  vec3 lit = (sum / samples) * uExposure;
  fragColour = vec4(toDisplay(clamp(lit, 0.0, 1.0)), 1.0);
}
