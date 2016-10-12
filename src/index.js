const
    FIELD_WIDTH = 1000,
    FIELD_HEIGHT = 500,
    STEP = 20,
    W = Math.floor(FIELD_WIDTH/STEP),
    H = Math.floor(FIELD_HEIGHT/STEP),
    flow = [], // [][] { dx, dy }
    oil = [], // [] { x, y, [density] }
    FPS = 50;

let layerStream = null,
    layerOil = null,
    streamCanvas = null,
    oilCanvas = null,
    layersBlock = null,
    lastMousePos = { x: 0, y: 0 },
    creatingOil = false;

let SIM_SPEED = 0.1;

function init () {

    // pseudo-random flow generation
    const MAX_SPEED = STEP, RANDOM_FACTOR = 3, VORTEX_FACTOR = 4;
    let dirFactor = Math.random() > 0.5 ? 1 : -1,
        dir = Math.random();
    layersBlock = document.getElementById("layers");
    for (let i = 0; i < H; i++) {
        flow[i] = [];
        for (let j = 0; j < W; j++) {
            let a = (flow[i - 1] || [])[j] || {},
                b = (flow[i - 1] || [])[j - 1] || {},
                c = (flow[i] || [])[j - 1] || {};
            dirFactor = Math.random() > 0.95 ? -dirFactor : dirFactor;
            dir += 0.3 * dirFactor * (Math.random() + 0.3);
            if (a.dx || b.dx || c.dx) {
                let valDX = ((a.dx || 0) + (b.dx || 0) + (c.dx || 0)) / (!!a.dx + !!b.dx + !!c.dx),
                    valDY = ((a.dy || 0) + (b.dy || 0) + (c.dy || 0)) / (!!a.dy + !!b.dy + !!c.dy);
                // console.log(valDX, valDY);
                flow[i][j] = {
                    dx: Math.min(Math.max(-MAX_SPEED,
                        valDX
                            + (Math.random()*RANDOM_FACTOR*2 - RANDOM_FACTOR)
                            + VORTEX_FACTOR*Math.cos(dir))
                        , MAX_SPEED),
                    dy: Math.min(Math.max(-MAX_SPEED,
                        valDY
                            + (Math.random()*RANDOM_FACTOR*2 - RANDOM_FACTOR)
                            + VORTEX_FACTOR*Math.sin(dir))
                        , MAX_SPEED)
                }
            } else {
                flow[i][j] = {
                    dx: Math.random() * MAX_SPEED * 2 - MAX_SPEED,
                    dy: Math.random() * MAX_SPEED * 2 - MAX_SPEED
                }
            }
        }
    }

    layersBlock.style.width = `${ (W - 1) * STEP }px`;
    layersBlock.style.height = `${ (H - 1) * STEP }px`;
    layerStream = getNewCanvas();
    layerStream.style.opacity = 0.3;
    streamCanvas = layerStream.getContext("2d");
    layerOil = getNewCanvas();
    oilCanvas = layerOil.getContext("2d");
    layersBlock.appendChild(layerOil);
    layersBlock.appendChild(layerStream);
    redrawStreams();

    layersBlock.addEventListener(`mousedown`, (e) => {
        creatingOil = true;
        lastMousePos.x = e.offsetX;
        lastMousePos.y = e.offsetY;
    });
    layersBlock.addEventListener(`mousemove`, (e) => {
        lastMousePos.x = e.offsetX;
        lastMousePos.y = e.offsetY;
    });
    layersBlock.addEventListener(`mouseup`, (e) => {
        creatingOil = false;
        lastMousePos.x = e.offsetX;
        lastMousePos.y = e.offsetY;
    });
    let time = Date.now();
    setInterval(() => {
        let now = Date.now();
        step((now - time) / (1000 / FPS));
        time = now;
    }, 1000 / FPS);

}

function calculateSpeed (x, y) {
    let sx = Math.floor(x / STEP),
        sy = Math.floor(y / STEP);
    if (sx * STEP === x && sy * STEP === y)
        return { dx: flow[sy][sx].dx, dy: flow[sy][sx].dy };
    let isBottomTriangle = x + y > (sx + 1) * STEP + sy * STEP,
        sxA = isBottomTriangle ? sx + 1 : sx,
        syA = isBottomTriangle ? sy + 1 : sy,
        xA = sxA * STEP, yA = syA * STEP,
        xB = sx * STEP,
        xC = (sx + 1) * STEP,
        a = { dx: flow[syA][sx].dx, dy: flow[syA][sx].dy },
        b = { dx: flow[sy + 1][sx].dx, dy: flow[sy + 1][sx].dy },
        c = { dx: flow[sy][sx + 1].dx, dy: flow[sy][sx + 1].dy },
        K = interceptionPoint(
            { x: xA, y: yA },
            { x, y },
            { x: sx * STEP, y: (sy + 1) * STEP },
            { x: (sx + 1) * STEP, y: sy * STEP }
        );
    let alpha = (K.x - xB) / (xC - xB),
        alphaK = K.x - xA !== 0 ? (x - xA) / (K.x - xA)
            : (K.y - yA !== 0) ? (y - yA) / (K.y - yA) : 0,
        k = { dx: b.dx + (c.dx - b.dx) * alpha, dy: b.dy + (c.dy - b.dy) * alpha };
    let c1 = a.dx + (k.dx - a.dx) * alphaK,
        c2 = a.dy + (k.dy - a.dy) * alphaK;
    if (typeof c1 !== "number" || typeof c2 !== "number" || isNaN(c1) || isNaN(c2)) {
        console.error(`E: x=${ x }, y=${ y }, c1=${c1}, c2=${c2}, alpha=${alpha}, K={x:${ K.x 
            },y:${K.y}}, xA:${xA}, yA:${yA}, x:${x}, y:${y}, sx=${sx*STEP},x=${x}, sy=${sy*STEP
            },y=${y}`); // should never happen though...
        return { dx: flow[sy][sx].dx, dy: flow[sy][sx].dy };
    }
    return {
        dx: a.dx + (k.dx - a.dx) * alphaK,
        dy: a.dy + (k.dy - a.dy) * alphaK
    }
}

function step (deltaTime) { // delta time should be 1 if FPS = real FPS.
    if (creatingOil)
        addOil(lastMousePos.x, lastMousePos.y);
    for (let i = 0; i < oil.length; i++) {
        let speed = calculateSpeed(oil[i].x, oil[i].y);
        oil[i].x += speed.dx * deltaTime * SIM_SPEED;
        oil[i].y += speed.dy * deltaTime * SIM_SPEED;
        if (oil[i].x < 0 || oil[i].y < 0
            || oil[i].x + STEP > FIELD_WIDTH || oil[i].y + STEP > FIELD_HEIGHT) {
            oil.splice(i, 1);
            i--;
        }
    }
    redrawOil();
}

function addOil (x, y) {
    for (let i = 0; i < oil.length; i++) {
        if (oil[i].x === x && oil[i].y === y) return;
    }
    oil.push({ x, y });
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function redrawStreams () {
    streamCanvas.strokeStyle = `black`;
    streamCanvas.fillStyle = `black`;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            streamCanvas.beginPath();
            streamCanvas.arc(x * STEP, y * STEP, 1, 0, 2*Math.PI);
            streamCanvas.fill();
            canvasArrow(
                streamCanvas,
                x * STEP,
                y * STEP,
                x * STEP + flow[y][x].dx,
                y * STEP + flow[y][x].dy
            );
            streamCanvas.closePath();
        }
    }
}

function redrawOil () {
    oilCanvas.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    oilCanvas.fillStyle = `rgba(0,0,0,0.3)`;
    for (let i = 0; i < oil.length; i++) {
        oilCanvas.beginPath();
        oilCanvas.arc(oil[i].x, oil[i].y, 3, 0, 2*Math.PI);
        streamCanvas.closePath();
        oilCanvas.fill();
    }
}

function getNewCanvas () {
    let c = document.createElement("canvas");
    c.style.width = (W - 1) * STEP;
    c.style.height = (H - 1) * STEP;
    c.setAttribute("width", (W - 1) * STEP);
    c.setAttribute("height", (H - 1) * STEP);
    return c;
}

function interceptionPoint (A, B, C, D) {
    let a = { x: B.y - A.y, y: D.y - C.y },
        b = { x: A.x - B.x, y: C.x - D.x },
        c = {
            x: -((B.x - A.x) * A.y - (B.y - A.y) * A.x),
            y: -((D.x - C.x) * C.y - (D.y - C.y) * C.x)
        },
        d = a.x * b.y - b.x * a.y,
        d1 = c.x * b.y - b.x * c.y,
        d2 = a.x * c.y - c.x * a.y;
    return {
        x: d1 / d,
        y: d2 / d
    }
}

function canvasArrow (context, fromx, fromy, tox, toy) {
    const head = 5;   // length of head in pixels
    var angle = Math.atan2(toy-fromy,tox-fromx);
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox-head*Math.cos(angle-Math.PI/6),toy-head*Math.sin(angle-Math.PI/6));
    context.moveTo(tox, toy);
    context.lineTo(tox-head*Math.cos(angle+Math.PI/6),toy-head*Math.sin(angle+Math.PI/6));
    context.stroke();
}

if (document.readyState !== "loading")
    init();
else
    document.addEventListener(`DOMContentLoaded`, init, false);