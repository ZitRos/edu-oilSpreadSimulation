const
    FIELD_WIDTH = 1000,
    FIELD_HEIGHT = 500,
    STEP = 20,
    W = Math.floor(FIELD_WIDTH/STEP),
    H = Math.floor(FIELD_HEIGHT/STEP),
    FPS = 50,
    MAX_DEPTH = 200,
    MAX_HEIGHT = 200,
    MAX_SPEED = STEP,
    HEIGHTS_BLOCK_HEIGHT = 150,
    LIGHT_AMOUNT = 0.8,
    OIL_DOT_RADIUS = 9;

let lastMousePos = { x: 0, y: 0 },
    field = [], // [][] { dx, dy, h },
    oil = [], // x, y, height, mass
    currentMapName = "",
    layerStream = null,
    layerOil = null,
    streamCanvas = null,
    oilCanvas = null,
    layersBlock = null,
    creatingOil = false,
    heightsBlock = null,
    layerHeights = null,
    heightsCanvas = null,
    layerTerrain = null,
    terrainCanvas = null,
    topGradientBlock = null,
    bottomGradientBlock = null,
    simSpeedSlider = null,
    simSpeedLabel = null,
    tempCanvas = null,
    mapNameInput = null,
    mapsSelect = null,
    deleteButton = null;

let SIM_SPEED = 0.05;

// pseudo-random field generation
function generateField () {
    const RANDOM_FACTOR = 3, VORTEX_FACTOR = 5, DEEP_FACTOR = 40, HEIGHT_FACTOR = 5;
    let dirFactor = Math.random() > 0.5 ? 1 : -1,
        dir = Math.random(),
        field = [];
    for (let i = 0; i < H; i++) {
        field[i] = [];
        for (let j = 0; j < W; j++) {
            let a = (field[i - 1] || [])[j] || {},
                b = (field[i - 1] || [])[j - 1] || {},
                c = (field[i] || [])[j - 1] || {};
            dirFactor = Math.random() > 0.95 ? -dirFactor : dirFactor;
            dir += 0.3 * dirFactor * (Math.random() + 0.3);
            if (a.dx || b.dx || c.dx) {
                let valDX = ((a.dx || 0) + (b.dx || 0) + (c.dx || 0)) / (!!a.dx + !!b.dx + !!c.dx),
                    valDY = ((a.dy || 0) + (b.dy || 0) + (c.dy || 0)) / (!!a.dy + !!b.dy + !!c.dy),
                    valH = ((a.h || 0) + (b.h || 0) + (c.h || 0)) / (!!a.h + !!b.h + !!c.h),
                    crFactor = valH > -10 ? DEEP_FACTOR : HEIGHT_FACTOR,
                    h = Math.min(Math.max(-MAX_HEIGHT,
                        valH
                        + (Math.random()*crFactor*2 - crFactor)
                    ), MAX_DEPTH);
                // console.log(valDX, valDY);
                field[i][j] = {
                    dx: h <= 0 ? 0 : Math.min(Math.max(-MAX_SPEED,
                            valDX
                            + (Math.random()*RANDOM_FACTOR*2 - RANDOM_FACTOR)
                            + VORTEX_FACTOR*Math.cos(dir))
                        , MAX_SPEED) * (valH < MAX_DEPTH / 20 ? 0.1 : 1),
                    dy: h <= 0 ? 0 : Math.min(Math.max(-MAX_SPEED,
                            valDY
                            + (Math.random()*RANDOM_FACTOR*2 - RANDOM_FACTOR)
                            + VORTEX_FACTOR*Math.sin(dir))
                        , MAX_SPEED) * (valH < MAX_DEPTH / 20 ? 0.1 : 1),
                    h: h
                }
            } else {
                field[i][j] = {
                    dx: Math.random() * MAX_SPEED * 2 - MAX_SPEED,
                    dy: Math.random() * MAX_SPEED * 2 - MAX_SPEED,
                    h: Math.random() * (MAX_DEPTH + MAX_HEIGHT) - MAX_HEIGHT
                }
            }
        }
    }
    return field;
}

function init () {

    layersBlock = document.getElementById("layers");
    simSpeedLabel = document.getElementById(`simSpeed`);
    simSpeedSlider = document.getElementById("simSpeedSlider");
    mapNameInput = document.getElementById("mapName");
    mapsSelect = document.getElementById("maps");
    deleteButton = document.getElementById("deleteMapButton");
    simSpeedSlider.addEventListener(`input`, updateSimSpeed);
    updateSimSpeed();

    // oilContainer = document.getElementById("oil");
    field = generateField();

    layersBlock.style.width = `${ (W - 1) * STEP }px`;
    layersBlock.style.height = `${ (H - 1) * STEP }px`;
    heightsBlock = document.getElementById("heights");
    heightsBlock.style.height = `${ HEIGHTS_BLOCK_HEIGHT }px`;
    heightsBlock.style.bottom = `${ -HEIGHTS_BLOCK_HEIGHT - 10 }px`;
    topGradientBlock = document.getElementById(`topGradient`);
    let hPoint = 100 * MAX_HEIGHT / (MAX_HEIGHT + MAX_DEPTH);
    topGradientBlock.style.height = `${ hPoint }%`;
    bottomGradientBlock = document.getElementById(`bottomGradient`);
    bottomGradientBlock.style.top = `${ hPoint }%`;
    bottomGradientBlock.style.height = `${ 100 - hPoint }%`;
    tempCanvas = getNewCanvas().getContext("2d");
    layerStream = getNewCanvas();
    layerStream.style.opacity = 0.3;
    layerTerrain = getNewCanvas();
    terrainCanvas = layerTerrain.getContext("2d");
    streamCanvas = layerStream.getContext("2d");
    layerHeights = getNewCanvas(FIELD_WIDTH, HEIGHTS_BLOCK_HEIGHT);
    heightsCanvas = layerHeights.getContext("2d");
    layerOil = getNewCanvas();
    layerOil.style.filter = "blur(1px)";
    oilCanvas = layerOil.getContext("2d");
    layersBlock.appendChild(layerTerrain);
    layersBlock.appendChild(layerStream);
    layersBlock.appendChild(layerOil);
    heightsBlock.appendChild(layerHeights);
    redrawStreams();
    redrawTerrain();
    updateMapsSelect();

    document.getElementById("saveMapButton").addEventListener("click", () => {
        if (!mapNameInput.value)
            return;
        saveMap(mapNameInput.value);
    });

    mapsSelect.addEventListener("change", () => {
        loadMap((mapsSelect.options[mapsSelect.selectedIndex] || {}).value);
    });
    deleteButton.addEventListener("click", () => {
        if (!currentMapName)
            return;
        deleteMap(currentMapName);
    });

    // layerOil.style.opacity = 0;
    // layerOil.style.zIndex = 10000;
    layerOil.addEventListener(`mousedown`, (e) => {
        creatingOil = true;
        lastMousePos.x = e.offsetX;
        lastMousePos.y = e.offsetY;
    });
    layerOil.addEventListener(`mousemove`, (e) => {
        lastMousePos.x = e.offsetX;
        lastMousePos.y = e.offsetY;
    });
    layerOil.addEventListener(`mouseup`, (e) => {
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

function getMedianPoint (x, y) {
    let sx = Math.floor(x / STEP),
        sy = Math.floor(y / STEP);
    if (sx * STEP === x && sy * STEP === y)
        return { dx: field[sy][sx].dx, dy: field[sy][sx].dy, h: field[sy][sx].h };
    let isBottomTriangle = x + y > (sx + 1) * STEP + sy * STEP,
        sxA = isBottomTriangle ? sx + 1 : sx,
        syA = isBottomTriangle ? sy + 1 : sy,
        xA = sxA * STEP,
        yA = syA * STEP,
        xB = sx * STEP,
        xC = (sx + 1) * STEP,
        a = { dx: field[syA][sxA].dx, dy: field[syA][sxA].dy, h: field[syA][sxA].h },
        b = { dx: field[sy + 1][sx].dx, dy: field[sy + 1][sx].dy, h: field[sy + 1][sx].h },
        c = {
            dx: (field[sy][sx + 1] || field[sy][sx]).dx,
            dy: (field[sy][sx + 1] || field[sy][sx]).dy,
            h: (field[sy][sx + 1] || field[sy][sx]).h
        },
        K = interceptionPoint(
            { x: xA, y: yA },
            { x, y },
            { x: sx * STEP, y: (sy + 1) * STEP },
            { x: (sx + 1) * STEP, y: sy * STEP }
        );
    let alpha = (K.x - xB) / (xC - xB),
        alphaK = K.x - xA !== 0 ? (x - xA) / (K.x - xA)
            : (K.y - yA !== 0) ? (y - yA) / (K.y - yA) : 0,
        k = {
            dx: b.dx + (c.dx - b.dx) * alpha,
            dy: b.dy + (c.dy - b.dy) * alpha,
            h: b.h + (c.h - b.h) * alpha
        };
    let c1 = a.dx + (k.dx - a.dx) * alphaK,
        c2 = a.dy + (k.dy - a.dy) * alphaK;
    if (typeof c1 !== "number" || typeof c2 !== "number" || isNaN(c1) || isNaN(c2)) {
        console.error(`E: x=${ x }, y=${ y }, c1=${c1}, c2=${c2}, alpha=${alpha}, K={x:${ K.x 
            },y:${K.y}}, xA:${xA}, yA:${yA}, x:${x}, y:${y}, sx=${sx*STEP},x=${x}, sy=${sy*STEP
            },y=${y}`); // should never happen though...
        return { dx: field[sy][sx].dx, dy: field[sy][sx].dy };
    }
    return {
        dx: a.dx + (k.dx - a.dx) * alphaK,
        dy: a.dy + (k.dy - a.dy) * alphaK,
        h: a.h + (k.h - a.h) * alphaK
    }
}

function step (deltaTime) { // delta time should be 1 if FPS = real FPS.
    if (creatingOil)
        addOil(lastMousePos.x, lastMousePos.y);
    for (let i = 0; i < oil.length; i++) {
        let median = getMedianPoint(oil[i].x, oil[i].y);
        if (median.h > oil[i].h) {
            oil[i].x += median.dx * deltaTime * SIM_SPEED;
            oil[i].y += median.dy * deltaTime * SIM_SPEED;
            oil[i].h += oil[i].m * (Math.random() / 5 + 0.2) * (SIM_SPEED * 10);
            oil[i].h = Math.min(median.h, oil[i].h);
        }
        for (let j = 0; j < oil.length; j++) {
            if (i === j) continue;
            let d = distance(oil[i], oil[j]);
            if (d > OIL_DOT_RADIUS) continue;
            let dir = Math.atan2(-(oil[j].x - oil[i].x), (oil[j].y - oil[i].y)),
                v = (OIL_DOT_RADIUS - d) / (2 - SIM_SPEED),
                vx = v * Math.cos(dir),
                vy = v * Math.sin(dir);
            oil[i].x += vx;
            oil[i].y += vy;
            oil[j].x -= vx;
            oil[j].y -= vy;
        }
        if (oil[i].x <= 1 || oil[i].y <= 1
            || oil[i].x + STEP >= FIELD_WIDTH - 1 || oil[i].y + STEP >= FIELD_HEIGHT - 1) {
            // if (oil[i].element.parentNode)
            //     oil[i].element.parentNode.removeChild(oil[i].element);
            oil.splice(i, 1);
            i--;
        }
    }
    redrawOil();
    redrawHeights(lastMousePos.y);
    redrawCursor();
}

function saveMap (mapName = "New Map") {
    let maps = JSON.parse(localStorage.getItem("maps")) || {};
    maps[mapName] = {
        field: field,
        oil: oil
    };
    localStorage.setItem("maps", JSON.stringify(maps));
    currentMapName = mapName;
    updateMapsSelect();
}

function updateMapsSelect () {
    let maps = JSON.parse(localStorage.getItem("maps"));
    mapsSelect.textContent = "";
    let selected = false;
    for (let map in maps) {
        let opt = document.createElement("option");
        opt.setAttribute("value", map);
        opt.textContent = map;
        if (currentMapName === map) {
            opt.setAttribute("selected", "");
            selected = true;
        }
        mapsSelect.appendChild(opt);
    }
    if (!selected) {
        let opt = document.createElement("option");
        opt.textContent = "Select a map...";
        opt.setAttribute("selected", "");
        mapsSelect.appendChild(opt);
    }
    deleteButton.disabled = !currentMapName;
}

function loadMap (map = "New Map") {
    let maps = JSON.parse(localStorage.getItem("maps"));
    if (!maps || !maps[map])
        return;
    field = maps[map].field;
    oil = maps[map].oil;
    currentMapName = map;
    mapNameInput.value = map;
    updateMapsSelect();
    redrawTerrain();
    redrawStreams();
}

function deleteMap (mapName) {
    let maps = JSON.parse(localStorage.getItem("maps"));
    if (!maps || !maps[mapName])
        return;
    delete maps[mapName];
    localStorage.setItem("maps", JSON.stringify(maps));
    if (currentMapName === mapName) {
        currentMapName = "";
        mapNameInput.value = "New Map";
    }
    updateMapsSelect();
}

function addOil (x, y) {
    for (let i = 0; i < oil.length; i++) {
        if (oil[i].x === x && oil[i].y === y) return;
    }
    let p = getMedianPoint(x, y);
        // el = document.createElement(`div`);
    // oilContainer.appendChild(el);
    oil.push({
        x, y, h: Math.min(0, p.h), m: Math.random() < LIGHT_AMOUNT ? 0 : Math.random()
        // element: el
    });
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function updateSimSpeed () {
    SIM_SPEED = simSpeedSlider.value / 100;
    simSpeedLabel.textContent = Math.round(SIM_SPEED * 100);
}

function distance (oil1, oil2) {
    return Math.sqrt(Math.pow(oil1.x - oil2.x, 2) + Math.pow(oil1.y - oil2.y, 2) + Math.pow(oil1.h - oil2.h, 2));
}

function redrawStreams () {
    streamCanvas.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    streamCanvas.strokeStyle = `black`;
    streamCanvas.fillStyle = `black`;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (field[y][x].h <= 0)
                continue;
            streamCanvas.beginPath();
            streamCanvas.arc(x * STEP, y * STEP, 1, 0, 2*Math.PI);
            streamCanvas.fill();
            canvasArrow(
                streamCanvas,
                x * STEP,
                y * STEP,
                x * STEP + field[y][x].dx,
                y * STEP + field[y][x].dy
            );
            streamCanvas.closePath();
        }
    }
}

function redrawHeights (y = lastMousePos.y) {
    const OIL_VIEW_DISTANCE = 60,
          FULL_HEIGHT = MAX_DEPTH + MAX_HEIGHT,
          divPoint = MAX_HEIGHT / FULL_HEIGHT;
    heightsCanvas.clearRect(0, 0, FIELD_WIDTH, HEIGHTS_BLOCK_HEIGHT);
    heightsCanvas.fillStyle = `brown`;
    heightsCanvas.beginPath();
    let fp = getMedianPoint(0, y);
    heightsCanvas.moveTo(0, (fp.h / FULL_HEIGHT + divPoint) * HEIGHTS_BLOCK_HEIGHT);
    for (let x = 1; x < W; x++) {
        let median = getMedianPoint(x * STEP, y);
        median.h = (median.h / FULL_HEIGHT + divPoint) * HEIGHTS_BLOCK_HEIGHT;
        heightsCanvas.lineTo(x * STEP, median.h);
        // heightsCanvas.moveTo(x * STEP, median.h);
    }
    heightsCanvas.lineTo(FIELD_WIDTH - STEP, HEIGHTS_BLOCK_HEIGHT);
    // heightsCanvas.moveTo(FIELD_WIDTH - STEP, HEIGHTS_BLOCK_HEIGHT);
    heightsCanvas.lineTo(0, HEIGHTS_BLOCK_HEIGHT);
    // heightsCanvas.moveTo(0, HEIGHTS_BLOCK_HEIGHT);
    heightsCanvas.lineTo(0, (fp.h / FULL_HEIGHT + divPoint) * HEIGHTS_BLOCK_HEIGHT);
    heightsCanvas.closePath();
    heightsCanvas.fill();

    for (let i = 0; i < oil.length; i++) {
        let alpha = OIL_VIEW_DISTANCE - Math.min(OIL_VIEW_DISTANCE, Math.abs(oil[i].y - y));
        heightsCanvas.beginPath();
        heightsCanvas.fillStyle = `rgba(0,0,0,${ Math.round(alpha) / OIL_VIEW_DISTANCE })`;
        heightsCanvas.arc(oil[i].x,
            (oil[i].h / FULL_HEIGHT + divPoint) * HEIGHTS_BLOCK_HEIGHT, OIL_DOT_RADIUS, 0, 2*Math.PI
        );
        heightsCanvas.fill();
        heightsCanvas.closePath();
    }
}

function redrawOil () {
    tempCanvas.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    oilCanvas.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    for (let i = 0; i < oil.length; i++) {
        let alpha = (1 - Math.max(0, oil[i].h) / MAX_DEPTH),
            grd = oilCanvas.createRadialGradient(
                oil[i].x, oil[i].y, 2, oil[i].x, oil[i].y, OIL_DOT_RADIUS*2
            );
        grd.addColorStop(0, `rgba(0,0,0,${ alpha/2 + 0.25 })`); // ${ 0.5 - alpha/3 }
        grd.addColorStop(1, `rgba(0,0,0,0)`);
        tempCanvas.beginPath();
        tempCanvas.fillStyle = grd;
        tempCanvas.arc(oil[i].x, oil[i].y, OIL_DOT_RADIUS*2, 0, 2*Math.PI);
        tempCanvas.fill();
        tempCanvas.closePath();
        // oil[i].element.style.left = `${ oil[i].x }px`;
        // oil[i].element.style.top = `${ oil[i].y }px`;
    }
    let imageData = tempCanvas.getImageData(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3] < 128) {
            imageData.data[i + 3] = 0;
        } else {
            // imageData.data[i + 3] = imageData.data[i];
            imageData.data[i+3] = 255;
        }
    }
    oilCanvas.putImageData(imageData, 0, 0);
}

function redrawCursor () {
    oilCanvas.beginPath();
    oilCanvas.strokeStyle = `rgba(255,0,0,0.2)`;
    oilCanvas.moveTo(0, lastMousePos.y);
    oilCanvas.lineTo(FIELD_WIDTH, lastMousePos.y);
    oilCanvas.closePath();
    oilCanvas.stroke();
    heightsCanvas.beginPath();
    heightsCanvas.strokeStyle = `rgba(0,255,0,0.3)`;
    heightsCanvas.moveTo(lastMousePos.x, 0);
    heightsCanvas.lineTo(lastMousePos.x, FIELD_HEIGHT);
    heightsCanvas.closePath();
    heightsCanvas.stroke();
}

function redrawTerrain () {
    terrainCanvas.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    let col, h,
        imageData = terrainCanvas.getImageData(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    for (let y = 0; y < FIELD_HEIGHT - STEP; y++) {
        for (let x = 0; x < FIELD_WIDTH - STEP; x++) {
            // terrainCanvas.beginPath();
            // terrainCanvas.moveTo(x * STEP, y * STEP);
            // terrainCanvas.lineTo((x + 1) * STEP, y * STEP);
            // terrainCanvas.lineTo((x + 1) * STEP, (y + 1) * STEP);
            // col = Math.round(
            //     128 * getMedianPoint(x * STEP + STEP * 0.75, y * STEP + STEP * 0.25).h / MAX_DEPTH
            // );
            // terrainCanvas.fillStyle = `rgb(${ 255 - col * 2 },${ 255 - col },255)`;
            // terrainCanvas.closePath();
            // terrainCanvas.fill();
            // terrainCanvas.beginPath();
            // terrainCanvas.moveTo(x * STEP, y * STEP);
            // terrainCanvas.lineTo(x * STEP, (y + 1) * STEP);
            // terrainCanvas.lineTo((x + 1) * STEP, (y + 1) * STEP);
            // col = Math.round(
            //     128 * getMedianPoint(x * STEP + STEP * 0.25, y * STEP + STEP * 0.75).h / MAX_DEPTH
            // );
            // terrainCanvas.fillStyle = `rgb(${ 255 - col * 2 },${ 255 - col },255)`;
            // terrainCanvas.closePath();
            // terrainCanvas.fill();
            h = getMedianPoint(x, y).h;
            if (h > 0) {
                col = Math.round(128 * h / MAX_DEPTH);
                imageData.data[1000 * 4 * y + 4*x] = 255 - col * 2;
                imageData.data[1000 * 4 * y + 4*x + 1] = 255 - col;
                imageData.data[1000 * 4 * y + 4*x + 2] = 255;
                imageData.data[1000 * 4 * y + 4*x + 3] = 255;
            } else {
                col = Math.round(128 * -h / MAX_HEIGHT);
                imageData.data[1000 * 4 * y + 4*x] = 255 - col * 2;
                imageData.data[1000 * 4 * y + 4*x + 1] = 255 - col;
                imageData.data[1000 * 4 * y + 4*x + 2] = 255 - col * 2;
                imageData.data[1000 * 4 * y + 4*x + 3] = 255;
            }
        }
    }

    terrainCanvas.putImageData(imageData, 0, 0);
    // terrainCanvas.putImageData(id, 0, 0);
    // console.log(FIELD_WIDTH - STEP, FIELD_HEIGHT - STEP);
    // let id = terrainCanvas.getImageData(0, 0, 400, FIELD_HEIGHT),
    //     d = id.data;
    // // terrainCanvas.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    // for (let y = 0; y < 400; y++) {
    //     for (let x = 0; x < 400; x++) {
    //         let p = y*(400) + x,
    //             h = getMedianPoint(x, y).h,
    //             col = Math.round(128 * h / MAX_DEPTH);
    //         d[p] = 255 - col * 2;
    //         d[p + 1] = 255 - col;
    //         d[p + 2] = 255;
    //         d[p + 3] = 255;
    //     }
    // }
    // terrainCanvas.putImageData(id, 0, 0);
}

function getNewCanvas (WW = (W - 1) * STEP, HH = (H - 1) * STEP) {
    let c = document.createElement("canvas");
    c.style.width = `${ WW }px`;
    c.style.height = `${ HH }px`;
    c.setAttribute("width", WW);
    c.setAttribute("height", HH);
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
    let angle = Math.atan2(toy-fromy,tox-fromx);
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