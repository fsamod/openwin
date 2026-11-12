import { toggleTheme } from './theme.js';

const canvas = document.getElementById('ropeCanvas');

if (canvas) {
  initRope(canvas);
}

function initRope(canvasElement) {
  const context = canvasElement.getContext('2d');
  if (!context) {
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const width = 140;
  const height = 104;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const anchor = { x: width / 2, y: 9 };
  const segmentCount = 10;
  const segmentLength = 6.6;
  const restLength = segmentCount * segmentLength;
  const stiffness = 0.32;
  const gravity = 0.24;
  const damping = 0.985;
  const restStiffness = 0.08;
  const grabRadius = 30;
  const repelRadius = 30;
  const repelStart = 2;
  const repelEnd = segmentCount - 3;
  const darkColorStops = [
    { at: 0, rgb: [139, 152, 169] },
    { at: 0.35, rgb: [231, 237, 245] },
    { at: 0.65, rgb: [139, 152, 169] },
    { at: 1, rgb: [42, 54, 68] }
  ];
  const lightColorStops = [
    { at: 0, rgb: [100, 116, 139] },
    { at: 0.35, rgb: [37, 99, 235] },
    { at: 0.65, rgb: [71, 85, 105] },
    { at: 1, rgb: [15, 23, 42] }
  ];

  canvasElement.width = width * dpr;
  canvasElement.height = height * dpr;
  context.scale(dpr, dpr);

  const points = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    points.push({
      x: anchor.x,
      y: anchor.y + index * segmentLength,
      previousX: anchor.x,
      previousY: anchor.y + index * segmentLength,
      invMass: index === 0 ? 0 : 1
    });
  }

  const pointer = { x: anchor.x, y: anchor.y + restLength };
  const pointerVelocity = { x: 0, y: 0 };

  let grabbedIndex = null;
  let hovering = false;
  let frame = null;
  let lastFrameTime = 0;
  let accumulator = 0;
  let idleFrames = 0;
  let settleFrames = 0;
  let frameCount = 0;
  let baselineReady = false;
  let baselineLength = restLength;
  let baselineTipY = anchor.y + restLength;
  let displayedPull = 0;
  let dragDistance = 0;
  let motionX = Number.isFinite(window.screenX) ? window.screenX : 0;
  let motionY = Number.isFinite(window.screenY) ? window.screenY : 0;
  let motionTime = 0;
  let motionVelocityX = 0;
  let motionVelocityY = 0;
  let leanX = 0;
  let leanY = 0;
  let motionTimer = null;

  function toCanvasPoint(event) {
    const rect = canvasElement.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: Math.min(width - 6, Math.max(6, (event.clientX - rect.left) * scaleX)),
      y: Math.min(height - 6, Math.max(6, (event.clientY - rect.top) * scaleY))
    };
  }

  function isLightTheme() {
    return document.documentElement.dataset.theme === 'light';
  }

  function colorForPull(pull) {
    const clamped = Math.min(1, Math.max(0, pull));
    const light = isLightTheme();
    const colorStops = light ? lightColorStops : darkColorStops;

    for (let index = 1; index < colorStops.length; index += 1) {
      const previous = colorStops[index - 1];
      const next = colorStops[index];

      if (clamped <= next.at) {
        const mix = (clamped - previous.at) / (next.at - previous.at);
        const rgb = previous.rgb.map((channel, channelIndex) =>
          Math.round(channel + (next.rgb[channelIndex] - channel) * mix)
        );
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      }
    }

    return light ? 'rgb(15, 23, 42)' : 'rgb(42, 54, 68)';
  }

  function totalLength() {
    let length = 0;
    for (let index = 1; index < points.length; index += 1) {
      length += Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y
      );
    }
    return length;
  }

  function captureBaseline() {
    baselineLength = totalLength();
    baselineTipY = points[points.length - 1].y;
    baselineReady = true;
  }

  function pullAmount() {
    const tip = points[points.length - 1];
    const displacement = Math.hypot(tip.x - anchor.x, tip.y - baselineTipY);
    const stretch = Math.max(0, totalLength() - baselineLength);
    return Math.min(1, displacement / 48 + stretch / 36);
  }

  function solveConstraint(first, second) {
    const deltaX = second.x - first.x;
    const deltaY = second.y - first.y;
    const distance = Math.hypot(deltaX, deltaY) || 0.0001;
    const difference = ((distance - segmentLength) / distance) * stiffness;
    const weight = first.invMass + second.invMass;

    if (weight === 0) {
      return;
    }

    first.x += deltaX * difference * (first.invMass / weight);
    first.y += deltaY * difference * (first.invMass / weight);
    second.x -= deltaX * difference * (second.invMass / weight);
    second.y -= deltaY * difference * (second.invMass / weight);
  }

  function step() {
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index];
      if (point.invMass === 0) {
        continue;
      }

      const velocityX = (point.x - point.previousX) * damping;
      const velocityY = (point.y - point.previousY) * damping;

      point.previousX = point.x;
      point.previousY = point.y;
      point.x += velocityX + leanX;
      point.y += velocityY + gravity + leanY;

      if (
        hovering &&
        grabbedIndex === null &&
        index >= repelStart &&
        index <= repelEnd &&
        pointer.y < height * 0.68
      ) {
        const deltaX = point.x - pointer.x;
        const deltaY = point.y - pointer.y;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance > 0.001 && distance < repelRadius) {
          const force = (1 - distance / repelRadius) * 1.4;
          point.x += (deltaX / distance) * force;
          point.y += (deltaY / distance) * force;
        }
      }

      if (grabbedIndex === null && !hovering) {
        point.x += (anchor.x - point.x) * restStiffness;
        point.y += (anchor.y + index * segmentLength - point.y) * restStiffness;
      }
    }

    for (let iteration = 0; iteration < 8; iteration += 1) {
      for (let index = 0; index < points.length - 1; index += 1) {
        solveConstraint(points[index], points[index + 1]);
      }

      points[0].x = anchor.x;
      points[0].y = anchor.y;

      if (grabbedIndex !== null) {
        points[grabbedIndex].x = pointer.x;
        points[grabbedIndex].y = pointer.y;
      }
    }

    const tip = points[points.length - 1];
    const previous = points[points.length - 2];

    if (grabbedIndex !== points.length - 1 && tip.y < previous.y) {
      tip.x += tip.x >= previous.x ? 0.6 : -0.6;
    }

    for (const point of points) {
      point.x = Math.min(width - 4, Math.max(4, point.x));
      point.y = Math.min(height - 4, Math.max(4, point.y));
    }
  }

  function traceRope() {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    const tip = points[points.length - 1];
    const light = isLightTheme();
    const color = colorForPull(displayedPull);

    context.fillStyle = light ? '#94a3b8' : '#2b3745';
    context.fillRect(anchor.x - 7, 2, 14, 4);
    context.beginPath();
    context.arc(anchor.x, 6, 2.2, 0, Math.PI * 2);
    context.fillStyle = light ? '#64748b' : '#748396';
    context.fill();

    traceRope();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    context.lineWidth = 4.5;
    context.stroke();

    traceRope();
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.stroke();

    traceRope();
    context.setLineDash([2, 3]);
    context.strokeStyle = light ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.22)';
    context.lineWidth = 0.8;
    context.stroke();
    context.setLineDash([]);

    context.beginPath();
    context.arc(tip.x, tip.y, 4.4, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = light ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.35)';
    context.lineWidth = 1;
    context.stroke();

    context.beginPath();
    context.arc(tip.x, tip.y, 1.7, 0, Math.PI * 2);
    context.fillStyle = light ? '#ffffff' : '#090c10';
    context.fill();
  }

  function updateRopeLabel() {
    canvasElement.setAttribute(
      'aria-label',
      isLightTheme() ? 'Switch to dark theme' : 'Switch to light theme'
    );
  }

  function kineticEnergy() {
    let energy = 0;
    for (const point of points) {
      const velocityX = point.x - point.previousX;
      const velocityY = point.y - point.previousY;
      energy += velocityX * velocityX + velocityY * velocityY;
    }
    return energy;
  }

  function sampleWindowMotion(now) {
    const nextX = Number.isFinite(window.screenX) ? window.screenX : motionX;
    const nextY = Number.isFinite(window.screenY) ? window.screenY : motionY;
    const deltaX = nextX - motionX;
    const deltaY = nextY - motionY;
    const elapsed = Math.min(250, Math.max(8, now - motionTime));
    motionX = nextX;
    motionY = nextY;
    motionTime = now;

    if (deltaX === 0 && deltaY === 0) {
      const decay = Math.exp(-elapsed / 100);
      motionVelocityX *= decay;
      motionVelocityY *= decay;
    } else {
      const blend = 1 - Math.exp(-elapsed / 90);
      motionVelocityX += ((deltaX / elapsed) * 1000 - motionVelocityX) * blend;
      motionVelocityY += ((deltaY / elapsed) * 1000 - motionVelocityY) * blend;
    }

    const targetLeanX = Math.max(-0.12, Math.min(0.12, -motionVelocityX * 0.0001));
    const targetLeanY = Math.max(-0.3, Math.min(0.3, -motionVelocityY * 0.0003));
    const follow = 1 - Math.exp(-elapsed / 90);
    leanX += (targetLeanX - leanX) * follow;
    leanY += (targetLeanY - leanY) * follow;

    return deltaX !== 0 || deltaY !== 0;
  }

  function watchWindowMotion() {
    if (sampleWindowMotion(window.performance.now())) {
      idleFrames = 0;
      start();
    }
  }

  function startMotionWatch() {
    if (reduceMotion || motionTimer !== null) {
      return;
    }

    motionX = Number.isFinite(window.screenX) ? window.screenX : 0;
    motionY = Number.isFinite(window.screenY) ? window.screenY : 0;
    motionVelocityX = 0;
    motionVelocityY = 0;
    leanX = 0;
    leanY = 0;
    motionTime = window.performance.now();
    motionTimer = window.setInterval(watchWindowMotion, 90);
    start();
  }

  function stopMotionWatch() {
    if (motionTimer === null) {
      return;
    }

    window.clearInterval(motionTimer);
    motionTimer = null;
  }

  function shouldContinue() {
    if (grabbedIndex !== null || hovering) {
      return true;
    }

    if (kineticEnergy() > 0.02 || Math.abs(leanX) > 0.001 || Math.abs(leanY) > 0.001) {
      idleFrames = 0;
      return true;
    }

    idleFrames += 1;
    return idleFrames < 60;
  }

  function tick(now) {
    frame = null;
    sampleWindowMotion(now);
    frameCount += 1;
    const elapsed = Math.max(0, Math.min(now - lastFrameTime, 50));
    lastFrameTime = now;
    accumulator += elapsed;

    let steps = 0;
    while (accumulator >= 16.6667 && steps < 3) {
      step();
      accumulator -= 16.6667;
      steps += 1;
    }

    if (!baselineReady) {
      if (grabbedIndex === null && !hovering && kineticEnergy() < 0.08) {
        settleFrames += 1;
      } else {
        settleFrames = 0;
      }

      if (settleFrames > 20 || (frameCount > 120 && grabbedIndex === null && !hovering)) {
        captureBaseline();
      }
    }

    if (baselineReady) {
      const targetPull = grabbedIndex !== null || hovering ? pullAmount() : 0;
      displayedPull += (targetPull - displayedPull) * 0.25;
    }

    draw();

    if (shouldContinue()) {
      frame = window.requestAnimationFrame(tick);
    } else {
      accumulator = 0;
    }
  }

  function start() {
    if (frame !== null || reduceMotion) {
      return;
    }

    lastFrameTime = window.performance.now();
    frame = window.requestAnimationFrame(tick);
  }

  function handlePointerMove(event) {
    const next = toCanvasPoint(event);
    pointerVelocity.x = next.x - pointer.x;
    pointerVelocity.y = next.y - pointer.y;

    if (grabbedIndex !== null) {
      dragDistance += Math.hypot(pointerVelocity.x, pointerVelocity.y);
    }

    pointer.x = next.x;
    pointer.y = next.y;

    if (grabbedIndex !== null) {
      points[grabbedIndex].x = pointer.x;
      points[grabbedIndex].y = pointer.y;
    }

    if (grabbedIndex === null) {
      hovering = true;
      start();
    }
  }

  function handlePointerDown(event) {
    if (reduceMotion) {
      toggleTheme();
      return;
    }

    const position = toCanvasPoint(event);
    let nearestIndex = null;
    let nearestDistance = grabRadius;

    for (let index = 1; index < points.length; index += 1) {
      const distance = Math.hypot(points[index].x - position.x, points[index].y - position.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    if (nearestIndex === null) {
      return;
    }

    event.preventDefault();
    if (!baselineReady) {
      captureBaseline();
    }
    pointer.x = position.x;
    pointer.y = position.y;
    pointerVelocity.x = 0;
    pointerVelocity.y = 0;
    dragDistance = 0;
    grabbedIndex = nearestIndex;
    points[grabbedIndex].invMass = 0;
    canvasElement.setPointerCapture(event.pointerId);
    canvasElement.classList.add('is-pulling');
    start();
  }

  function releasePointer(event) {
    if (grabbedIndex === null) {
      return;
    }

    const pull = pullAmount();
    const point = points[grabbedIndex];
    point.invMass = 1;
    point.previousX = point.x - Math.max(-14, Math.min(14, pointerVelocity.x)) * 0.9;
    point.previousY = point.y - Math.max(-14, Math.min(14, pointerVelocity.y)) * 0.9;
    grabbedIndex = null;
    hovering = false;
    idleFrames = 0;
    canvasElement.classList.remove('is-pulling');

    if (canvasElement.hasPointerCapture(event.pointerId)) {
      canvasElement.releasePointerCapture(event.pointerId);
    }

    if (pull > 0.55 && dragDistance > 12) {
      toggleTheme();
    }

    start();
  }

  canvasElement.addEventListener('pointerenter', (event) => {
    if (grabbedIndex !== null) {
      return;
    }

    const position = toCanvasPoint(event);
    pointer.x = position.x;
    pointer.y = position.y;
    hovering = true;
    start();
  });

  canvasElement.addEventListener('pointermove', handlePointerMove);
  canvasElement.addEventListener('pointerdown', handlePointerDown);
  canvasElement.addEventListener('pointerup', releasePointer);
  canvasElement.addEventListener('pointercancel', releasePointer);
  canvasElement.addEventListener('pointerleave', () => {
    if (grabbedIndex === null) {
      hovering = false;
    }
    start();
  });

  window.addEventListener('resize', () => {
    canvasElement.width = width * dpr;
    canvasElement.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  });

  canvasElement.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleTheme();
    }
  });

  window.addEventListener('openwin:themechange', () => {
    updateRopeLabel();
    draw();
    start();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopMotionWatch();
      return;
    }

    startMotionWatch();
  });

  updateRopeLabel();
  draw();
  start();
  startMotionWatch();
}
