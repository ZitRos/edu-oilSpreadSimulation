const
    FIELD_WIDTH = 1000,
    FIELD_HEIGHT = 500,
    STEP = 20,
    W = Math.floor(FIELD_WIDTH/STEP),
    H = Math.floor(FIELD_HEIGHT/STEP),
    model = []; // [][] { dx, dy }

let layerStream = null,
    streamCanvas = null,
    layersBlock = null;

function init () {

    // pseudo-random model generation
    const MAX_SPEED = STEP, RANDOM_FACTOR = 3, VORTEX_FACTOR = 4;
    let dirFactor = Math.random() > 0.5 ? 1 : -1,
        dir = Math.random();
    layersBlock = document.getElementById("layers");
    for (let i = 0; i < H; i++) {
        model[i] = [];
        for (let j = 0; j < W; j++) {
            let a = (model[i - 1] || [])[j] || {},
                b = (model[i - 1] || [])[j - 1] || {},
                c = (model[i] || [])[j - 1] || {};
            dirFactor = Math.random() > 0.95 ? -dirFactor : dirFactor;
            dir += 0.3 * dirFactor * (Math.random() + 0.3);
            console.log(dir);
            if (a.dx || b.dx || c.dx) {
                let valDX = ((a.dx || 0) + (b.dx || 0) + (c.dx || 0)) / (!!a.dx + !!b.dx + !!c.dx),
                    valDY = ((a.dy || 0) + (b.dy || 0) + (c.dy || 0)) / (!!a.dy + !!b.dy + !!c.dy);
                // console.log(valDX, valDY);
                model[i][j] = {
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
                model[i][j] = {
                    dx: Math.random() * MAX_SPEED * 2 - MAX_SPEED,
                    dy: Math.random() * MAX_SPEED * 2 - MAX_SPEED
                }
            }
        }
    }

    layersBlock.style.width = `${ (W - 1) * STEP }px`;
    layersBlock.style.height = `${ (H - 1) * STEP }px`;
    layerStream = getNewCanvas();
    streamCanvas = layerStream.getContext("2d");
    layersBlock.appendChild(layerStream);
    redrawStreams();

}

////////////////////////////////////////////////////////////////////////////////////////////////////

function redrawStreams () {
    streamCanvas.strokeStyle = `gray`;
    streamCanvas.fillStyle = `gray`;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            streamCanvas.beginPath();
            streamCanvas.arc(x * STEP, y * STEP, 1, 0, 360);
            streamCanvas.fill();
            streamCanvas.closePath();
            canvasArrow(
                streamCanvas,
                x * STEP,
                y * STEP,
                x * STEP + model[y][x].dx,
                y * STEP + model[y][x].dy
            );
        }
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
    var headlen = 5;   // length of head in pixels
    var angle = Math.atan2(toy-fromy,tox-fromx);
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
    context.moveTo(tox, toy);
    context.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
    context.stroke();
}

if (document.readyState !== "loading")
    init();
else
    document.addEventListener(`DOMContentLoaded`, init, false);