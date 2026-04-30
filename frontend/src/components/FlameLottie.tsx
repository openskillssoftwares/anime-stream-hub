import { Player } from "@lottiefiles/react-lottie-player";

/**
 * Tiny Lottie used as a decorative loading shimmer / hero accent.
 * We embed JSON inline to avoid extra network calls and to keep it lightweight.
 *
 * This animates a small flame burst — fits the ember theme.
 */
const flameJson = {
  v: "5.7.4", fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: "flame", ddd: 0, assets: [],
  layers: [
    {
      ddd: 0, ind: 1, ty: 4, nm: "ring", sr: 1,
      ks: {
        o: { a: 1, k: [
          { t: 0, s: [80] }, { t: 30, s: [40] }, { t: 60, s: [80] },
        ] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { t: 0, s: [80, 80, 100] }, { t: 30, s: [115, 115, 100] }, { t: 60, s: [80, 80, 100] },
        ] },
      },
      ao: 0,
      shapes: [
        {
          ty: "el", d: 1,
          s: { a: 0, k: [120, 120] },
          p: { a: 0, k: [0, 0] },
        },
        {
          ty: "st",
          c: { a: 0, k: [0.97, 0.52, 0.2, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 6 },
          lc: 2, lj: 2,
        },
        {
          ty: "tr",
          p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
        },
      ],
      ip: 0, op: 60, st: 0,
    },
  ],
  markers: [],
};

export const FlameLottie = ({ size = 80 }: { size?: number }) => (
  <Player
    autoplay
    loop
    src={flameJson as object}
    style={{ width: size, height: size }}
    keepLastFrame
  />
);
