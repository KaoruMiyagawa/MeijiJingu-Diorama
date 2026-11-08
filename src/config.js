export const CONFIG = Object.freeze({
  seed: 19201101,
  size: 80,
  pixelRatio: 1.6,
  shadowSize: 4096,
  wind: true,
  exposure: 1.12,
  treeCount: 245,
});

// South is +Z; dimensions deliberately compress the official precinct plan.
export const VIEWS = {
  1: { position: [76, 100, 116], target: [0, 2, 0], span: 100 },
  2: { position: [10, 17, 8], target: [0, 4.7, -17], span: 32 },
  3: { position: [16, 17, 55], target: [13, 4, 24], span: 32 },
  4: { position: [-91, 91, -102], target: [0, 2, 0], span: 103 },
  5: { position: [0, 145, 0.1], target: [0, 0, 0], span: 91 },
  6: { position: [0, 12, 43], target: [0, 5, -15], span: 46 },
};
