import type { NPC } from "./npc";

/**
 * People drawn as small editorial figures: flat shapes in muted cloth colours, a hair's-breadth of
 * outline, no faces. About 46 px tall at scale 1. Everything is a path on one canvas.
 */

const INK = "rgba(30, 26, 22, 0.3)";

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + k);
  ctx.lineTo(x + w, y + h - k);
  ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  ctx.lineTo(x + k, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - k);
  ctx.lineTo(x, y + k);
  ctx.quadraticCurveTo(x, y, x + k, y);
  ctx.closePath();
}

function limb(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** Draw one person with the feet at (n.x, n.y). `t` is the clock in seconds. */
export function drawFigure(ctx: CanvasRenderingContext2D, n: NPC, t: number, alpha: number) {
  const L = n.look;
  const sitting = n.state === "SITTING";
  const dragged = n.state === "DRAGGED";
  const moving = Math.hypot(n.vx, n.vy);
  const walking = !sitting && !dragged && moving > 7;
  const s = n.scale * (dragged ? 1.08 : 1);
  const ph = n.phase * Math.PI * 2;
  const swing = walking ? Math.sin(ph) * Math.min(0.62, 0.2 + moving / 110) : dragged ? Math.sin(n.phase * 1.7) * 0.22 : 0;
  const bob = walking ? Math.abs(Math.sin(ph)) * 1.3 : !sitting && !dragged ? Math.sin(t * 1.6 + n.seed) * 0.35 : 0;
  const hop = n.react > 0 ? Math.sin(Math.min(1, n.react * 1.6) * Math.PI) * 6 : 0;
  const lean = dragged ? Math.max(-0.35, Math.min(0.35, -n.vx * 0.0016)) : n.state === "PUSHED" ? Math.max(-0.4, Math.min(0.4, n.vx * 0.004)) : walking ? 0.05 : 0;

  ctx.save();
  ctx.globalAlpha = alpha;

  // the shadow stays on the floor when somebody is lifted off it
  const lift = dragged ? 12 * s : 0;
  ctx.fillStyle = "rgba(40, 32, 22, 0.13)";
  ctx.beginPath();
  ctx.ellipse(n.x, n.y + 1, 9 * s * L.build * (dragged ? 0.8 : 1), 2.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(n.x, n.y - lift - hop * s);
  ctx.scale(n.dir * s, s);
  ctx.rotate(lean * n.dir);

  const hipY = sitting ? -11 : -19 + (walking ? -bob : 0);
  const shoulderY = hipY - 12.5;
  const headY = shoulderY - 6.2 + (n.react > 0 ? -Math.sin(n.react * 9) * 0.8 : 0);
  const bw = 5.2 * L.build;

  // behind the body: a bag, the far arm
  if (L.item === "bag" && !sitting) {
    ctx.fillStyle = "rgba(60, 52, 44, 0.62)";
    rr(ctx, -bw - 4.2, shoulderY + 1, 5, 10, 2);
    ctx.fill();
  }
  const farSwing = -swing;
  const handsUp = dragged;
  const armW = 2.6;
  const sx = 0;
  const armLen = 11.5;
  const arm = (a: number, color: string) => {
    const ax = Math.sin(a) * armLen;
    const ay = Math.cos(a) * armLen;
    limb(ctx, sx, shoulderY + 1.5, sx + ax, shoulderY + 1.5 + ay, armW, color);
    return { x: sx + ax, y: shoulderY + 1.5 + ay };
  };
  const sleeve = L.top;
  if (!handsUp) arm(sitting ? 0.9 : farSwing * 0.9, sleeve);
  else arm(-2.6, sleeve);

  // legs
  const pant = L.bottom;
  if (sitting) {
    // thigh forward, shin down
    limb(ctx, 0, hipY, 10, hipY + 0.5, 3.4, pant);
    limb(ctx, 10, hipY + 0.5, 10.5, hipY + 10.5, 3.2, pant);
    ctx.fillStyle = L.shoe;
    ctx.beginPath();
    ctx.ellipse(12, hipY + 11, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const legL = 19 - (walking ? bob : 0);
    for (const sgn of [-1, 1]) {
      const a = swing * sgn;
      const fx = Math.sin(a) * legL;
      const fy = Math.cos(a) * legL;
      limb(ctx, sgn * -0.2, hipY, fx, hipY + Math.min(fy, 19.6), 3.3, pant);
      ctx.fillStyle = L.shoe;
      ctx.beginPath();
      ctx.ellipse(fx + 1.2, hipY + Math.min(fy, 19.6) + 0.5, 3, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // torso (and a long coat for the librarian)
  ctx.fillStyle = L.top;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7;
  if (L.coat && !sitting) {
    ctx.beginPath();
    ctx.moveTo(-bw, shoulderY);
    ctx.lineTo(bw, shoulderY);
    ctx.lineTo(bw + 1.8, hipY + 7);
    ctx.lineTo(-bw - 1.8, hipY + 7);
    ctx.closePath();
  } else {
    rr(ctx, -bw, shoulderY, bw * 2, hipY - shoulderY + 2, 3);
  }
  ctx.fill();
  ctx.stroke();

  // head
  const tilt = n.reading ? 0.16 : 0;
  ctx.save();
  ctx.translate(0.6 * n.lookW, headY);
  ctx.rotate(tilt);
  ctx.fillStyle = L.skin;
  ctx.beginPath();
  ctx.arc(0, 0, 4.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // hair
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  if (L.hairStyle === 3) {
    ctx.arc(0, -0.6, 4.8, Math.PI * 1.05, Math.PI * 1.95);
  } else {
    ctx.arc(0, -0.3, 4.95, Math.PI * 0.95, Math.PI * 2.0);
    if (L.hairStyle === 2) {
      ctx.lineTo(4.7, 4.2);
      ctx.lineTo(-4.9, 4.2);
    }
  }
  ctx.closePath();
  ctx.fill();
  if (L.hairStyle === 1) {
    ctx.beginPath();
    ctx.arc(-4.6, -2.6, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // a nose, so you can tell which way they are looking
  ctx.fillStyle = L.skin;
  ctx.beginPath();
  ctx.moveTo(4.5, -0.6);
  ctx.lineTo(6.1, 1);
  ctx.lineTo(4.5, 1.7);
  ctx.closePath();
  ctx.fill();
  if (L.headphones) {
    ctx.strokeStyle = "rgba(48, 44, 42, 0.85)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -0.4, 5.6, Math.PI * 1.02, Math.PI * 1.98);
    ctx.stroke();
    ctx.fillStyle = "rgba(48, 44, 42, 0.9)";
    ctx.beginPath();
    ctx.ellipse(-0.2, 0.8, 1.6, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // near arm, and what is in the hand
  const nearA = sitting ? 1.2 : handsUp ? 2.7 : n.reading ? 1.15 : swing * 0.9;
  const hand = arm(nearA, L.top);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7;
  const item = sitting && n.role === "worker" ? "laptop" : L.item;
  switch (item) {
    case "book": {
      const x = n.reading ? 5.2 : hand.x + 1;
      const y = n.reading ? shoulderY + 7 : hand.y - 2;
      ctx.fillStyle = "rgba(168, 120, 96, 0.95)";
      rr(ctx, x - 1, y - 4, 8.4, 6.2, 0.9);
      ctx.fill();
      ctx.fillStyle = "rgba(248, 244, 236, 0.95)";
      ctx.fillRect(x, y - 3.2, 6.6, 4.4);
      break;
    }
    case "stack": {
      const x = hand.x + 0.6;
      const y = hand.y;
      const cols = ["rgba(120, 140, 128, 0.95)", "rgba(176, 144, 112, 0.95)", "rgba(112, 128, 150, 0.95)"];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cols[i];
        rr(ctx, x - 1.5, y - 2.4 - i * 2.8, 9.4 - i, 2.7, 0.6);
        ctx.fill();
      }
      break;
    }
    case "cup": {
      const x = hand.x + 1.4;
      const y = hand.y - 1.2;
      ctx.fillStyle = "rgba(246, 242, 234, 0.96)";
      rr(ctx, x - 2, y - 3.2, 4.2, 4.4, 0.8);
      ctx.fill();
      ctx.stroke();
      // steam, just a thread of it
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y - 4.2);
      ctx.bezierCurveTo(x + 1.6, y - 6.2 + Math.sin(t * 2 + n.seed), x - 1.6, y - 8, x + 0.4, y - 10);
      ctx.stroke();
      break;
    }
    case "laptop": {
      if (sitting) {
        ctx.fillStyle = "rgba(120, 124, 128, 0.95)";
        rr(ctx, 6, hipY - 4.6, 9, 1.8, 0.6);
        ctx.fill();
        ctx.fillStyle = "rgba(196, 202, 206, 0.95)";
        ctx.save();
        ctx.translate(14.4, hipY - 4.6);
        ctx.rotate(-1.35);
        ctx.fillRect(0, -7.6, 1.5, 7.6);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(120, 124, 128, 0.95)";
        rr(ctx, hand.x - 3, hand.y - 1.4, 11, 1.8, 0.6);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}
