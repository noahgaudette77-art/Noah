// Body proportions in centimetres for a ~180 cm (5'11") athlete.
export const BODY = {
  hipW: 9.5,
  lumbar: 20,
  thoracic: 31,
  shoulderDrop: 5,
  shoulderW: 18.5,
  neck: 8,
  headR: 10.5,
  upperArm: 31,
  forearm: 27,
  grip: 34, // elbow to centre of grip (forearm + hand)
  thigh: 46,
  shin: 45,
  ankleH: 7.5,
};

/** Anatomical limits for the interior joint angles (degrees, 180 = straight). */
export const LIMITS = {
  knee: [35, 180.5],
  elbow: [28, 180.5],
} as const;
