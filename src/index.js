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
    layersBlock = null;

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

    let pressed = false;
    layersBlock.addEventListener(`mousedown`, (e) => pressed = true);
    layersBlock.addEventListener(`mousemove`, (e) => {
        if (!pressed) return;
        addOil(e.offsetX, e.offsetY);
    });
    layersBlock.addEventListener(`mouseup`, (e) => pressed = false);
    let time = Date.now();
    setInterval(() => {
        let now = Date.now();
        step((now - time) / (1000 / FPS));
        time = now;
    }, 1000 / FPS);

}

function step (deltaTime) { // delta time should be 1 if FPS = real FPS.

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
    oilCanvas.fillStyle = `rgba(0,0,0,0.5)`;
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