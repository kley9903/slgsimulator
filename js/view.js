// ---------- 視圖控制 (平移、縮放) ----------

// 視圖狀態
let view = {
    x: 0,
    y: 0,
    scale: 0.3
};

// 拖曳狀態
let isDragging = false;
let lastMouseX = 0, lastMouseY = 0;

// 初始化視圖 (將地圖中心對齊畫面中心)
function resetView(canvas) {
    const centerCol = MAP_COLS / 2;
    const centerRow = MAP_ROWS / 2;
    const worldCenter = gridToWorld(centerCol, centerRow);
    
//    view.x = canvas.width / 2 - worldCenter.x * view.scale;
//    view.y = canvas.height / 2 - worldCenter.y * view.scale;
    view.x = -20;
    view.y = -1200;

    // 確保初始不超出邊界
    clampView(view, canvas);
}

// 滑鼠事件處理
function onMouseDown(e, canvas) {
    e.preventDefault();
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
}

function onMouseMove(e, canvas, renderCallback) {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    view.x += dx;
    view.y += dy;
    
    // 加入邊界限制
    clampView(view, canvas);
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    renderCallback();
}

function onMouseUp(e, canvas) {
    isDragging = false;
    canvas.style.cursor = 'grab';
}

function onWheel(e, canvas, renderCallback) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - view.x) / view.scale;
    const worldY = (mouseY - view.y) / view.scale;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    let newScale = view.scale * delta;
    newScale = Math.min(CONFIG.MAX_SCALE, Math.max(CONFIG.MIN_SCALE, newScale));
    
    view.x = mouseX - worldX * newScale;
    view.y = mouseY - worldY * newScale;
    view.scale = newScale;

    // 加入邊界限制（縮放後邊界範圍會改變，需重新計算）
    clampView(view, canvas);

    renderCallback();
}

// -------------------------------------------


// 計算地圖的矩形移動限制框（以網格索引為基礎）
function getWorldBounds() {
    // 我們直接定義限制框對應的網格行列範圍（加上了 1.2 倍的擴張）
    // 原始地圖範圍：col 從 0 到 MAP_COLS-1，row 從 0 到 MAP_ROWS-1
    // 擴張 1.2 倍後，相當於允許 view 移動到地圖邊界外 10% 的範圍（因為兩邊各擴張 0.1 倍）
    const colMargin = (MAP_COLS - 1) * 0.01;
    const rowMargin = (MAP_ROWS - 1) * 0.01;
    
    const minCol = 0 - colMargin;
    const maxCol = (MAP_COLS - 1) + colMargin;
    const minRow = 0 - rowMargin;
    const maxRow = (MAP_ROWS - 1) + rowMargin;

    // 將這些行列邊界轉換為世界座標（取四個角落的世界位置）
    const topLeft = gridToWorld(minCol, minRow);
    const topRight = gridToWorld(maxCol, minRow);
    const bottomLeft = gridToWorld(minCol, maxRow);
    const bottomRight = gridToWorld(maxCol, maxRow);

    // 找出這四個點的最小/最大 x,y
    const xs = [topLeft.x, topRight.x, bottomLeft.x, bottomRight.x];
    const ys = [topLeft.y, topRight.y, bottomLeft.y, bottomRight.y];
    
    return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys)
    };
}

// 限制 view 在允許範圍內
function clampView(view, canvas) {
    const bounds = getWorldBounds();
    const scale = view.scale;

    // 計算 view.x 與 view.y 的合法區間
    // 條件：畫面上任何一點的世界座標 = (canvasX - view.x)/scale 必須在 [bounds.minX, bounds.maxX] 之間
    // 因此 view.x 必須滿足：
    //   對於 canvasX = 0： (0 - view.x)/scale >= bounds.minX  => view.x <= -bounds.minX * scale
    //   對於 canvasX = canvas.width： (canvas.width - view.x)/scale <= bounds.maxX => view.x >= canvas.width - bounds.maxX * scale
    
    const minViewX = canvas.width - bounds.maxX * scale;
    const maxViewX = -bounds.minX * scale;
    
    const minViewY = canvas.height - bounds.maxY * scale;
    const maxViewY = -bounds.minY * scale;

    // 確保 min <= max（理論上一定成立）
    const finalMinX = Math.min(minViewX, maxViewX);
    const finalMaxX = Math.max(minViewX, maxViewX);
    const finalMinY = Math.min(minViewY, maxViewY);
    const finalMaxY = Math.max(minViewY, maxViewY);

    view.x = Math.min(finalMaxX, Math.max(finalMinX, view.x));
    view.y = Math.min(finalMaxY, Math.max(finalMinY, view.y));
}

// 獲取當前視圖 (供繪圖使用)
function getView() {
    return view;
}

// ---------- 觸摸事件處理 (手機/平板) ----------
let lastTouchDistance = 0;

function onTouchStart(e, canvas) {
    const touches = e.touches;
    if (touches.length === 1) {
        isDragging = true;
        lastMouseX = touches[0].clientX;
        lastMouseY = touches[0].clientY;
        canvas.style.cursor = 'grabbing';
    } else if (touches.length === 2) {
        isDragging = false;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
}

function onTouchMove(e, canvas, renderCallback) {
    const touches = e.touches;
    if (touches.length === 1 && isDragging) {
        const dx = touches[0].clientX - lastMouseX;
        const dy = touches[0].clientY - lastMouseY;
        view.x += dx;
        view.y += dy;
        clampView(view, canvas);
        lastMouseX = touches[0].clientX;
        lastMouseY = touches[0].clientY;
        renderCallback();
    } else if (touches.length === 2) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (lastTouchDistance > 0) {
            const scaleFactor = currentDistance / lastTouchDistance;
            const newScale = view.scale * scaleFactor;
            if (newScale >= CONFIG.MIN_SCALE && newScale <= CONFIG.MAX_SCALE) {
                const centerX = (touches[0].clientX + touches[1].clientX) / 2;
                const centerY = (touches[0].clientY + touches[1].clientY) / 2;
                const rect = canvas.getBoundingClientRect();
                const mouseX = centerX - rect.left;
                const mouseY = centerY - rect.top;

                const worldX = (mouseX - view.x) / view.scale;
                const worldY = (mouseY - view.y) / view.scale;

                view.scale = newScale;
                view.x = mouseX - worldX * view.scale;
                view.y = mouseY - worldY * view.scale;
                clampView(view, canvas);
                renderCallback();
            }
        }
        lastTouchDistance = currentDistance;
    }
}

function onTouchEnd(e, canvas) {
    isDragging = false;
    lastTouchDistance = 0;
    canvas.style.cursor = 'grab';
}

// 導出觸摸處理函數供 main.js 綁定
window.touchHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd
};