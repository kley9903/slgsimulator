// Canvas 圓角矩形輔助函式
CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
};

// 更新鼠标所在网格坐标显示
function updateGridCoords(mouseScreenX, mouseScreenY, view) {
    // 将屏幕坐标转为世界坐标
    const worldX = (mouseScreenX - view.x) / view.scale;
    const worldY = (mouseScreenY - view.y) / view.scale;
    
    // 转为网格索引（浮点数，保留一位小数）
    const col = (worldX / (CONFIG.TILE_WIDTH / 2) + worldY / (CONFIG.TILE_HEIGHT / 2)) / 2;
    const row = (worldY / (CONFIG.TILE_HEIGHT / 2) - worldX / (CONFIG.TILE_WIDTH / 2)) / 2;
    
    // 格式化显示
    const colStr = col.toFixed(2);
    const rowStr = row.toFixed(2);
    document.getElementById('grid-coords').innerHTML = `📌 座標：col ${colStr} , row ${rowStr}`;
}

// 根據螢幕座標找出被點擊的城市（返回城市物件或 null）
function getCityAtScreenPos(screenX, screenY, view) {
    // 將螢幕座標轉為世界座標
    const worldX = (screenX - view.x) / view.scale;
    const worldY = (screenY - view.y) / view.scale;
    
    // 設定點擊判定半徑（與城市圖片大小相關，可調整）
    const clickRadius = 40;
    
    for (let city of citiesData) {
        const worldPos = gridToWorld(city.col, city.row);
        const dx = worldX - worldPos.x;
        const dy = worldY - worldPos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < clickRadius) {
            return city;
        }
    }
    return null;
}

// ---------- 城市圖片載入 ----------
const cityTypes = ['small', 'middle', 'big', 'control', 'camp'];
const cityColors = ['default', 'red', 'blue'];

const cityImages = {};
let cityImagesLoaded = false;
let cityImagesToLoad = cityTypes.length * cityColors.length;
let cityImagesLoadedCount = 0;

// 初始化巢狀結構
cityTypes.forEach(type => { cityImages[type] = {}; });

cityTypes.forEach(type => {
    cityColors.forEach(color => {
        // 決定子目錄
        let subDir = '';
        if (color === 'red') subDir = 'red/';
        else if (color === 'blue') subDir = 'blue/';
        
        // 決定基礎檔名
        const baseName = type === 'camp' ? 'camp' : `${type}_city`;
        const fileName = `${baseName}.png`;
        const imgPath = `../image/city/${subDir}${fileName}`;
        
        const img = new Image();
        img.src = imgPath;
        img.onload = () => {
            cityImagesLoadedCount++;
            console.log(`✅ 載入成功: ${imgPath}`);
            if (cityImagesLoadedCount === cityImagesToLoad) {
                cityImagesLoaded = true;
                console.log('🎉 所有城市圖片載入完成，開始繪製');
                render(); // 圖片全部載入後立刻重繪一次
            }
        };
        img.onerror = () => {
            console.error(`❌ 圖片載入失敗: ${imgPath}`);
            cityImagesLoadedCount++;
            if (cityImagesLoadedCount === cityImagesToLoad) {
                cityImagesLoaded = true;
                render();
            }
        };
        cityImages[type][color] = img;
    });
});

// 覆蓋層圖片
const overlayImage = new Image();
overlayImage.src = '../image/map.png';
let overlayLoaded = false;
overlayImage.onload = () => { overlayLoaded = true; };

function drawCityLabel(ctx, city, centerX, centerY) {
    // 确定显示的等级文字
    let levelText;
    let diamondColor, textColor;
    const type = city.type;

    if (type === 'camp') {
        // 根据名称推断显示文字
        if (city.name.includes('兵')) levelText = '兵';
        else if (city.name.includes('醫')) levelText = '醫';
        else if (city.name.includes('馬')) levelText = '馬';
        else levelText = '營'; // 默认
        diamondColor = CONFIG.LEVEL_DIAMOND_COLORS.level1;
        textColor = CONFIG.LEVEL_TEXT_COLORS.level1;
    } else if (type === 'control') {
        levelText = '關';
        diamondColor = CONFIG.LEVEL_DIAMOND_COLORS.high;
        textColor = CONFIG.LEVEL_TEXT_COLORS.high;
    } else {
        // 普通城市：显示数字等级
        levelText = `${city.level}`;
        if (city.level < 5) {
            diamondColor = CONFIG.LEVEL_DIAMOND_COLORS.level1;
            textColor = CONFIG.LEVEL_TEXT_COLORS.level1;
        } else if (city.level >= 5) {
            diamondColor = CONFIG.LEVEL_DIAMOND_COLORS.high;
            textColor = CONFIG.LEVEL_TEXT_COLORS.high;
        } else {
            diamondColor = CONFIG.LEVEL_DIAMOND_COLORS.default;
            textColor = CONFIG.LEVEL_TEXT_COLORS.default;
        }
    }

    const nameText = city.name;
    const idText = `(${city.id})`;

    ctx.font = `${CONFIG.LABEL_FONT_SIZE}px ${CONFIG.LABEL_FONT_FAMILY}`;
    
    // 测量文字宽度
    const nameWidth = ctx.measureText(nameText).width;
    const idWidth = ctx.measureText(idText).width;
    const gap = 8;

    // 计算菱形实际大小（放大后）
    const diamondHalf = (CONFIG.LEVEL_DIAMOND_SIZE * CONFIG.LEVEL_DIAMOND_SCALE) / 2;
    const leftPaddingForDiamond = diamondHalf;

    // 计算标签总宽度（等级菱形右半部 + 名字 + ID）
    const totalTextWidth = leftPaddingForDiamond + gap + nameWidth + gap + idWidth;
    const boxWidth = totalTextWidth + CONFIG.LABEL_PADDING_X * 2;
    const boxHeight = CONFIG.LABEL_FONT_SIZE + CONFIG.LABEL_PADDING_Y * 2;
    
    // 标签背景的左上角：使标签整体水平居中于城市中心
    const boxX = centerX - boxWidth / 2;
    const boxY = centerY + CONFIG.LABEL_OFFSET_Y - boxHeight / 2;

    // 绘制半透明长方形背景（无边框）
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, CONFIG.LABEL_BORDER_RADIUS);
    ctx.fillStyle = CONFIG.LABEL_BG_COLOR;
    ctx.fill();

    // ----- 绘制等级菱形（中心在标签左边缘） -----
    const diamondCenterX = boxX + 20;
    const diamondCenterY = boxY + boxHeight / 2 + 4;

    ctx.beginPath();
    ctx.moveTo(diamondCenterX, diamondCenterY - diamondHalf); // 上
    ctx.lineTo(diamondCenterX + diamondHalf, diamondCenterY); // 右
    ctx.lineTo(diamondCenterX, diamondCenterY + diamondHalf); // 下
    ctx.lineTo(diamondCenterX - diamondHalf, diamondCenterY); // 左
    ctx.closePath();
    ctx.fillStyle = diamondColor;
    ctx.fill();

    // 绘制等级文字（居中于菱形）
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(levelText, diamondCenterX, diamondCenterY);

    // ----- 绘制名字与 ID（位于菱形右侧）-----
    const textStartX = boxX + leftPaddingForDiamond + CONFIG.LABEL_PADDING_X ; // 名字起始位置（考虑菱形占位和内边距）
    const nameX = textStartX + nameWidth / 2 + 5; // 名字的中心位置
    const idX = nameX + nameWidth / 2 + gap + idWidth / 2 + 14;
    const textY = diamondCenterY ;

    ctx.fillStyle = CONFIG.LABEL_TEXT_COLOR;
    ctx.fillText(nameText, nameX, textY);
    ctx.fillText(idText, idX, textY);

    ctx.restore();
}

// 繪製所有城市
function drawCities(ctx, view) {
    if (!cityImagesLoaded) return;

    for (let city of citiesData) {
        const color = city.color || 'default';
        const img = cityImages[city.type]?.[color];
        if (!img || !img.complete) continue;

        const worldPos = gridToWorld(city.col, city.row);
        const screenX = worldPos.x;
        const screenY = worldPos.y;

        // 繪製城市圖示
        const scale = typeof CONFIG.CITY_SCALE === 'object' 
            ? (CONFIG.CITY_SCALE[color] || 1.0) 
            : CONFIG.CITY_SCALE;
        const imgWidth = img.width * scale;
        const imgHeight = img.height * scale;
        const drawX = screenX - imgWidth / 2;
        const drawY = screenY - imgHeight / 2;
        ctx.drawImage(img, drawX, drawY, imgWidth, imgHeight);

        // 繪製資訊標籤（如果啟用）
        if (CONFIG.LABEL_SHOW) {
            drawCityLabel(ctx, city, screenX, screenY);
        }
    }
}

// 繪製城市之間的連線（陸地 + 水上）
function drawEdges(ctx, view) {
    // 建立 id 到城市的快速查找表
    const cityMap = new Map();
    citiesData.forEach(city => cityMap.set(city.id, city));

    // 儲存當前樣式狀態
    ctx.save();

    // ----- 繪製陸地道路 -----
    if (edgesData && edgesData.length > 0) {
        ctx.strokeStyle = CONFIG.EDGE_COLOR;
        ctx.lineWidth = CONFIG.EDGE_WIDTH;
        ctx.globalAlpha = CONFIG.EDGE_ALPHA;
        ctx.lineCap = 'round';

        for (let edge of edgesData) {
            const fromCity = cityMap.get(edge.from);
            const toCity = cityMap.get(edge.to);
            if (!fromCity || !toCity) continue;

            const fromPos = gridToWorld(fromCity.col, fromCity.row);
            const toPos = gridToWorld(toCity.col, toCity.row);

            ctx.beginPath();
            ctx.moveTo(fromPos.x, fromPos.y);
            ctx.lineTo(toPos.x, toPos.y);
            ctx.stroke();
        }
    }

    // ----- 繪製水上道路 -----
    if (typeof waterEdgesData !== 'undefined' && waterEdgesData.length > 0) {
        ctx.strokeStyle = CONFIG.WATER_EDGE_COLOR;
        ctx.lineWidth = CONFIG.WATER_EDGE_WIDTH;
        ctx.globalAlpha = CONFIG.WATER_EDGE_ALPHA;
        ctx.lineCap = 'round';

        for (let edge of waterEdgesData) {
            const fromCity = cityMap.get(edge.from);
            const toCity = cityMap.get(edge.to);
            if (!fromCity || !toCity) continue;

            const fromPos = gridToWorld(fromCity.col, fromCity.row);
            const toPos = gridToWorld(toCity.col, toCity.row);

            ctx.beginPath();
            ctx.moveTo(fromPos.x, fromPos.y);
            ctx.lineTo(toPos.x, toPos.y);
            ctx.stroke();
        }
    }

    // 恢復樣式
    ctx.restore();
}

// 繪製勢力區域（多邊形填色）
function drawAreas(ctx, view) {
    if (!areasData || areasData.length === 0) return;

    // 建立 id 到城市的快速查找表
    const cityMap = new Map();
    citiesData.forEach(city => cityMap.set(city.id, city));

    // 注意：ctx 已經在 drawMap 中應用過 view.translate 和 view.scale
    // 因此這裡不需要、也不能再次變換，直接使用世界座標繪製即可

    ctx.save(); // 僅保存樣式狀態

    for (let area of areasData) {
        if (!area.cities || area.cities.length < 3) continue;

        // 收集有效頂點的世界座標
        const points = [];
        for (let cityId of area.cities) {
            const city = cityMap.get(cityId);
            if (city) {
                const pos = gridToWorld(city.col, city.row);
                points.push({ x: pos.x, y: pos.y });
            }
        }
        if (points.length < 3) continue;

        // 繪製多邊形
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = area.color || 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
    }

    ctx.restore(); // 恢復樣式
}

// 繪製半透明覆蓋層（拉伸至整個菱形地圖邊界）
function drawOverlay(ctx, view) {
    if (!overlayLoaded) return;

    // 計算菱形地圖的實際邊界（不含擴張）
    // 最左、最右、最上、最下與之前計算方法相同
    const midRow = (MAP_ROWS - 1) / 2;
    const leftPoint = gridToWorld(0, midRow);
    const rightPoint = gridToWorld(MAP_COLS - 1, midRow);

    const midCol = (MAP_COLS - 1) / 2;
    const topPoint = gridToWorld(midCol, 0);
    const bottomPoint = gridToWorld(midCol, MAP_ROWS - 1);

    let minX = leftPoint.x;
    let maxX = rightPoint.x;
    let minY = topPoint.y;
    let maxY = bottomPoint.y;

    // 保險起見，再比較四個角落
    const corners = [
        gridToWorld(0, 0),
        gridToWorld(MAP_COLS - 1, 0),
        gridToWorld(0, MAP_ROWS - 1),
        gridToWorld(MAP_COLS - 1, MAP_ROWS - 1)
    ];
    corners.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });

    // 計算中心點與原始寬高
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const originalWidth = maxX - minX;
    const originalHeight = maxY - minY;

    // 根據設定檔的縮放比例計算新寬高
    const scaledWidth = originalWidth * CONFIG.OVERLAY_SCALE;
    const scaledHeight = originalHeight * CONFIG.OVERLAY_SCALE;

    // 計算新邊界（以中心點為基準向外擴張）
    let drawMinX = centerX - scaledWidth / 2;
    let drawMinY = centerY - scaledHeight / 2;

    // 套用使用者設定的偏移量
    drawMinX += CONFIG.OVERLAY_OFFSET_X;
    drawMinY += CONFIG.OVERLAY_OFFSET_Y;

    // 設定透明度（從 config 讀取）
    ctx.globalAlpha = CONFIG.OVERLAY_OPACITY;

    // 繪製圖片
    ctx.drawImage(
        overlayImage,
        drawMinX, drawMinY,
        scaledWidth, scaledHeight
    );

    // 恢復透明度
    ctx.globalAlpha = 1.0;
}

// ---------- 地圖繪製與座標轉換 ----------

// 將網格座標 (col, row) 轉為世界像素座標 (菱形中心)
function gridToWorld(col, row) {
    const x = (col - row) * (CONFIG.TILE_WIDTH / 2);
    const y = (col + row) * (CONFIG.TILE_HEIGHT / 2);
    return { x, y };
}

// 將世界座標轉為網格索引 (用於裁切計算)
function worldToGrid(wx, wy) {
    const col = (wx / (CONFIG.TILE_WIDTH / 2) + wy / (CONFIG.TILE_HEIGHT / 2)) / 2;
    const row = (wy / (CONFIG.TILE_HEIGHT / 2) - wx / (CONFIG.TILE_WIDTH / 2)) / 2;
    return { col: Math.floor(col), row: Math.floor(row) };
}

// 繪製整個地圖 (由 main.js 中的 render 呼叫)
function drawMap(ctx, tilesetImage, view) {
    if (!tilesetImage || !tilesetImage.complete) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    // 計算可視範圍的網格索引（修正右上/左下缺塊問題）
    const invScale = 1 / view.scale;

    // 取得畫面四個角落的世界座標
    const corners = [
        { x: (-view.x) * invScale, y: (-view.y) * invScale },                               // 左上
        { x: (canvas.width - view.x) * invScale, y: (-view.y) * invScale },                 // 右上
        { x: (-view.x) * invScale, y: (canvas.height - view.y) * invScale },                // 左下
        { x: (canvas.width - view.x) * invScale, y: (canvas.height - view.y) * invScale }   // 右下
    ];

    // 計算每個角落對應的網格行列（浮點數）
    let minCol = Infinity, maxCol = -Infinity;
    let minRow = Infinity, maxRow = -Infinity;

    corners.forEach(corner => {
        const grid = worldToGrid(corner.x, corner.y);
        minCol = Math.min(minCol, grid.col);
        maxCol = Math.max(maxCol, grid.col);
        minRow = Math.min(minRow, grid.row);
        maxRow = Math.max(maxRow, grid.row);
    });

    // 向外擴充邊界（確保完全覆蓋），並限制在地圖範圍內
    const PADDING = 2;
    const startCol = Math.max(0, Math.floor(minCol) - PADDING);
    const endCol = Math.min(MAP_COLS - 1, Math.ceil(maxCol) + PADDING);
    const startRow = Math.max(0, Math.floor(minRow) - PADDING);
    const endRow = Math.min(MAP_ROWS - 1, Math.ceil(maxRow) + PADDING);

    // 繪製菱形
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const worldPos = gridToWorld(col, row);
            const screenX = worldPos.x;
            const screenY = worldPos.y;

            ctx.drawImage(
                tilesetImage,
                TILE_SRC_X, TILE_SRC_Y, CONFIG.TILE_WIDTH, CONFIG.TILE_HEIGHT,
                screenX - CONFIG.TILE_WIDTH / 2,
                screenY - CONFIG.TILE_HEIGHT / 2,
                CONFIG.TILE_WIDTH,
                CONFIG.TILE_HEIGHT
            );
        }
    }

    // 繪製半透明覆蓋層
    drawOverlay(ctx, view);

    // 繪製勢力區域（半透明色塊）
    drawAreas(ctx, view);

     // 繪製城市連線
    drawEdges(ctx, view);

    // 繪製高亮路徑
    drawHighlightPath(ctx, view);

    // 繪製城市（必須在相同變換下進行，所以放在 restore 之前）
    drawCities(ctx, view);

    
    ctx.restore();

    // 更新資訊文字
    document.getElementById('info').innerHTML = 
        `🔍 拖曳平移 · 滾輪縮放 (${Math.round(view.scale * 100)}%) · 地圖尺寸 ${MAP_COLS}x${MAP_ROWS}`;
}

// 高亮路径的边（全局）
window.highlightPathEdges = [];

window.setHighlightPath = function(path) {
    window.highlightPathEdges = [];
    if (!path || path.length < 2) return;
    for (let i = 0; i < path.length - 1; i++) {
        window.highlightPathEdges.push({ from: path[i], to: path[i+1] });
    }
};

function drawHighlightPath(ctx, view) {
    if (window.highlightPathEdges.length === 0) return;

    const cityMap = new Map();
    citiesData.forEach(c => cityMap.set(c.id, c));

    // 注意：这里不再需要 ctx.save/restore 和 translate/scale，
    // 因为 drawMap 已经为我们设置好了正确的变换上下文。
    ctx.strokeStyle = '#000000';   // 亮绿色
    ctx.lineWidth = 12;
    ctx.globalAlpha = 0.9;
    ctx.lineCap = 'round';

    for (let edge of window.highlightPathEdges) {
        const fromCity = cityMap.get(edge.from);
        const toCity = cityMap.get(edge.to);
        if (!fromCity || !toCity) continue;

        const fromPos = gridToWorld(fromCity.col, fromCity.row);
        const toPos = gridToWorld(toCity.col, toCity.row);

        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
        ctx.stroke();
    }

    // 恢复透明度，避免影响后续绘制
    ctx.globalAlpha = 1.0;
}