// ---------- 主程式：初始化與事件綁定 ----------

const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');
const loadingDiv = document.getElementById('loading');

let tilesetImage = new Image();
let tilesetLoaded = false;

let editMode = false; // 是否处于新增城市模式
const editBtn = document.getElementById('toggle-edit-mode');

let edgeMode = false;                // 是否处于新增道路模式
let edgeModeFirstCity = null;        // 记录第一个选中的城市
const edgeBtn = document.getElementById('toggle-edge-mode');

let pathMode = false;               // 是否处于路径查询模式
let pathStartCity = null;           // 起点城市
const pathBtn = document.getElementById('toggle-path-mode');

// 渲染函式 (傳遞給 view 模組)
function render() {
    drawMap(ctx, tilesetImage, getView());
}

// 調整畫布尺寸
function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    if (tilesetLoaded) {
        render();
    }
}

// 根据屏幕坐标创建新城市
// 根据屏幕坐标创建新城市（手动输入 ID）
function createCityAtScreenPos(screenX, screenY) {
    const view = getView();
    const worldX = (screenX - view.x) / view.scale;
    const worldY = (screenY - view.y) / view.scale;
    
    // 转为网格坐标（保留两位小数）
    const col = (worldX / (CONFIG.TILE_WIDTH / 2) + worldY / (CONFIG.TILE_HEIGHT / 2)) / 2;
    const row = (worldY / (CONFIG.TILE_HEIGHT / 2) - worldX / (CONFIG.TILE_WIDTH / 2)) / 2;
    
    // 1. 输入名称
    const name = prompt('輸入城市名稱：', '新城');
    if (name === null || name.trim() === '') return;
    
    // 2. 输入类型
    let type = prompt('輸入城市類型 (small / middle / big / control / camp)：', 'small');
    const validTypes = window.cityTypes || ['small', 'middle', 'big', 'control', 'camp'];
    if (!validTypes.includes(type)) {
        alert(`無效類型，已設為 'small'`);
        type = 'small';
    }
    
    // 3. 输入等级
    const levelStr = prompt('輸入城市等級 (數字)：', '1');
    const level = parseInt(levelStr) || 1;
    
    // 4. 输入 ID（手动，必须唯一）
    let id = prompt('輸入城市 ID（例如 F37、C_01，不可與現有城市重複）：', '');
    if (id === null || id.trim() === '') {
        alert('❌ ID 不能為空，取消創建');
        return;
    }
    id = id.trim();
    
    // 检查 ID 是否已存在
    const existing = citiesData.find(c => c.id === id);
    if (existing) {
        alert(`❌ ID "${id}" 已存在，請使用其他 ID`);
        return;
    }
    
    // 创建新城市对象
    const newCity = {
        id: id,
        name: name.trim(),
        col: parseFloat(col.toFixed(4)),
        row: parseFloat(row.toFixed(4)),
        type: type,
        level: level,
        color: 'default'
    };
    
    citiesData.push(newCity);
    render();
    console.log(`✅ 新城市已创建：${name} (${id}) at (${newCity.col}, ${newCity.row})`);
}

// 目前選中的城市 ID
let selectedCityId = null;

// 顯示按鈕面板
function showColorButtons(cityId) {
    // 隱藏舊面板
    const existingPanel = document.getElementById('color-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'color-panel';

    const redBtn = document.createElement('button');
    redBtn.textContent = '🔴 紅色';
    redBtn.className = 'color-btn red';
    redBtn.onclick = () => {
        changeCityColor(cityId, 'red');
        panel.remove();
        selectedCityId = null;
    };

    const blueBtn = document.createElement('button');
    blueBtn.textContent = '🔵 藍色';
    blueBtn.className = 'color-btn blue';
    blueBtn.onclick = () => {
        changeCityColor(cityId, 'blue');
        panel.remove();
        selectedCityId = null;
    };

    panel.appendChild(redBtn);
    panel.appendChild(blueBtn);
    document.body.appendChild(panel);
}

// 切換城市顏色
function changeCityColor(cityId, newColor) {
    const city = citiesData.find(c => c.id === cityId);
    if (city) {
        city.color = newColor;
        render(); // 重新繪製地圖
    }
}

// 计算最短路径（Dijkstra，考虑陆地和水上道路）
function findShortestPath(startId, endId) {
    // 构建邻接表（无向图，包含两种道路）
    const graph = new Map();
    citiesData.forEach(c => graph.set(c.id, []));

    const addEdge = (from, to, weight = 1) => {
        // 确保两个节点都存在于图中
        if (!graph.has(from) || !graph.has(to)) return;
        graph.get(from).push({ id: to, weight });
        graph.get(to).push({ id: from, weight });
    };

    // 只添加两端城市都存在的边
    edgesData.forEach(e => {
        if (graph.has(e.from) && graph.has(e.to)) addEdge(e.from, e.to);
    });
    if (typeof waterEdgesData !== 'undefined') {
        waterEdgesData.forEach(e => {
            if (graph.has(e.from) && graph.has(e.to)) addEdge(e.from, e.to);
        });
    }

    // 检查起点终点是否存在
    if (!graph.has(startId) || !graph.has(endId)) return null;

    // Dijkstra
    const dist = new Map();
    const prev = new Map();
    const visited = new Set();
    const pq = [];

    citiesData.forEach(c => dist.set(c.id, Infinity));
    dist.set(startId, 0);
    pq.push({ id: startId, dist: 0 });

    while (pq.length > 0) {
        pq.sort((a, b) => a.dist - b.dist);
        const { id } = pq.shift();
        if (visited.has(id)) continue;
        visited.add(id);

        if (id === endId) break;

        const neighbors = graph.get(id) || [];
        for (let nb of neighbors) {
            if (visited.has(nb.id)) continue;
            const newDist = dist.get(id) + nb.weight;
            if (newDist < dist.get(nb.id)) {
                dist.set(nb.id, newDist);
                prev.set(nb.id, id);
                pq.push({ id: nb.id, dist: newDist });
            }
        }
    }

    // 回溯路径
    const path = [];
    let cur = endId;
    if (prev.get(cur) === undefined && cur !== startId) return null;
    while (cur) {
        path.unshift(cur);
        cur = prev.get(cur);
    }
    return path;
}

// 初始化
function init() {
    tilesetImage.onload = () => {
        tilesetLoaded = true;
        loadingDiv.style.display = 'none';
        resizeCanvas();
        resetView(canvas);
        render();
    };
    tilesetImage.onerror = () => {
        loadingDiv.innerHTML = '❌ 圖片載入失敗，請確認 ../image/environment/glass.png 存在';
    };
    tilesetImage.src = CONFIG.TILESET_PATH;

    // ----- 事件綁定 -----
    // 滑鼠移動 -> 更新座標顯示
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        updateGridCoords(mouseX, mouseY, getView());
    });


    // 點擊 -> 路徑查詢 / 新增道路 / 新增城市 / 顯示顏色按鈕
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const city = getCityAtScreenPos(mouseX, mouseY, getView());

        // ----- 1. 路徑查詢模式（優先）-----
        if (pathMode) {
            if (!city) {
                alert('請點擊一個城市');
                return;
            }
            if (pathStartCity === null) {
                pathStartCity = city;
                alert(`已選擇起點：${city.name} (${city.id})，請點擊終點`);
            } else {
                const startId = pathStartCity.id;
                const endId = city.id;
                if (startId === endId) {
                    alert('起點和終點不能相同');
                    pathStartCity = null;
                    return;
                }
                const path = findShortestPath(startId, endId);
                if (!path) {
                    alert('無法到達！');
                } else {
                    window.setHighlightPath(path);
                    render();
                    alert(`最短路徑：${path.join(' → ')}`);
                }
                pathStartCity = null;
            }
            return;
        }

        // ----- 2. 新增道路模式 -----
        if (edgeMode) {
            if (!city) {
                alert('請點擊一個城市作為起點或終點');
                return;
            }
            if (edgeModeFirstCity === null) {
                edgeModeFirstCity = city;
                alert(`已選擇起點：${city.name} (${city.id})，請點擊第二個城市`);
            } else {
                const cityA = edgeModeFirstCity;
                const cityB = city;
                if (cityA.id === cityB.id) {
                    alert('起點和終點不能相同，請重新選擇');
                    edgeModeFirstCity = null;
                    return;
                }
                const type = prompt('請輸入道路類型 (land / water)：', 'land');
                if (type !== 'land' && type !== 'water') {
                    alert('無效類型，取消新增道路');
                    edgeModeFirstCity = null;
                    return;
                }
                const targetArray = type === 'land' ? edgesData : waterEdgesData;
                const alreadyExists = targetArray.some(edge => 
                    (edge.from === cityA.id && edge.to === cityB.id) ||
                    (edge.from === cityB.id && edge.to === cityA.id)
                );
                if (alreadyExists) {
                    alert(`此${type === 'land' ? '陸地' : '水上'}道路已存在！`);
                    edgeModeFirstCity = null;
                    return;
                }
                targetArray.push({ from: cityA.id, to: cityB.id });
                render();
                console.log(`✅ 新增${type === 'land' ? '陸地' : '水上'}道路：${cityA.id} ↔ ${cityB.id}`);
                edgeModeFirstCity = null;
                alert(`已新增${type === 'land' ? '陸地' : '水上'}道路：${cityA.name} ↔ ${cityB.name}`);
            }
            return;
        }

        // ----- 3. 新增城市模式 -----
        if (editMode) {
            if (!city) {
                createCityAtScreenPos(mouseX, mouseY);
            } else {
                alert('此處已有城市，不能重複創建');
            }
            return;
        }

        // ----- 4. 普通模式：選中城市顯示顏色按鈕 -----
        if (city) {
            selectedCityId = city.id;
            showColorButtons(city.id);
        } else {
            const panel = document.getElementById('color-panel');
            if (panel) panel.remove();
            selectedCityId = null;
        }
    });

    // 拖曳與縮放事件
    canvas.addEventListener('mousedown', (e) => onMouseDown(e, canvas));
    window.addEventListener('mousemove', (e) => onMouseMove(e, canvas, render));
    window.addEventListener('mouseup', (e) => onMouseUp(e, canvas));
    canvas.addEventListener('wheel', (e) => onWheel(e, canvas, render), { passive: false });
    window.addEventListener('resize', () => {
        resizeCanvas();
        render();
    });

    // 匯出按鈕
    document.getElementById('export-data-btn').addEventListener('click', () => {
        // 辅助函数：将对象数组转为紧凑的单行字符串，每行一个对象
        function formatArrayToCompactLines(arr) {
            if (!arr || arr.length === 0) return '[]';
            const lines = arr.map(obj => {
                let json = JSON.stringify(obj);
                json = json.replace(/"([^"]+)":/g, '$1:');
                json = json.replace(/:"([^"]*?)"/g, ': \'$1\'');
                json = json.replace(/:([^'"].*?)(,|})/g, ':$1$2');
                return '    ' + json;
            });
            return '[\n' + lines.join(',\n') + '\n]';
        }

        const citiesOutput = formatArrayToCompactLines(citiesData);
        const edgesOutput = typeof edgesData !== 'undefined' ? formatArrayToCompactLines(edgesData) : '[]';
        const waterEdgesOutput = typeof waterEdgesData !== 'undefined' ? formatArrayToCompactLines(waterEdgesData) : '[]';
        const areasOutput = typeof areasData !== 'undefined' ? formatArrayToCompactLines(areasData) : '[]';  // ✅ 补上这一行

        const output = `// ---------- 城市資料 ----------
    const citiesData = ${citiesOutput};

    // ---------- 陸地道路連線資料 ----------
    const edgesData = ${edgesOutput};

    // ---------- 水上道路連線資料 ----------
    const waterEdgesData = ${waterEdgesOutput};

    // ---------- 勢力區域資料 ----------
    const areasData = ${areasOutput};
    `;

        const textarea = document.createElement('textarea');
        textarea.value = output;
        textarea.style.width = '600px';
        textarea.style.height = '400px';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '12px';
        
        const win = window.open('', '_blank', 'width=650,height=500');
        win.document.body.innerHTML = '<h3>複製以下內容，覆蓋 js/cities.js 即可儲存</h3>';
        win.document.body.appendChild(textarea);
        textarea.select();
    });

    // 道路模式切换按钮
    edgeBtn.addEventListener('click', () => {
        edgeMode = !edgeMode;
        edgeBtn.classList.toggle('active', edgeMode);
        edgeBtn.textContent = edgeMode ? '✅ 道路模式 (ON)' : '➕ 新增道路模式';
        // 互斥：关闭其他模式
        if (edgeMode) {
            if (editMode) {
                editMode = false;
                editBtn.classList.remove('active');
                editBtn.textContent = '➕ 新增城市模式';
            }
            if (pathMode) {
                pathMode = false;
                pathBtn.classList.remove('active');
                pathBtn.textContent = '🗺️ 路徑查詢';
                window.highlightPathEdges = [];
                render();
            }
        }
        edgeModeFirstCity = null;
        const panel = document.getElementById('color-panel');
        if (panel) panel.remove();
        selectedCityId = null;
    });
    // 同时修改城市编辑模式按钮，与道路模式互斥
    editBtn.addEventListener('click', () => {
        editMode = !editMode;
        editBtn.classList.toggle('active', editMode);
        editBtn.textContent = editMode ? '✅ 城市模式 (ON)' : '➕ 新增城市模式';
        if (editMode) {
            if (edgeMode) {
                edgeMode = false;
                edgeBtn.classList.remove('active');
                edgeBtn.textContent = '➕ 新增道路模式';
                edgeModeFirstCity = null;
            }
            if (pathMode) {
                pathMode = false;
                pathBtn.classList.remove('active');
                pathBtn.textContent = '🗺️ 路徑查詢';
                window.highlightPathEdges = [];
                render();
            }
        }
        const panel = document.getElementById('color-panel');
        if (panel) panel.remove();
        selectedCityId = null;
    });

    pathBtn.addEventListener('click', () => {
        pathMode = !pathMode;
        pathBtn.classList.toggle('active', pathMode);
        pathBtn.textContent = pathMode ? '🗺️ 查詢模式 (ON)' : '🗺️ 路徑查詢';
        if (pathMode) {
            if (editMode) {
                editMode = false;
                editBtn.classList.remove('active');
                editBtn.textContent = '➕ 新增城市模式';
            }
            if (edgeMode) {
                edgeMode = false;
                edgeBtn.classList.remove('active');
                edgeBtn.textContent = '➕ 新增道路模式';
                edgeModeFirstCity = null;
            }
        }
        pathStartCity = null;
        window.highlightPathEdges = [];
        render();
        const panel = document.getElementById('color-panel');
        if (panel) panel.remove();
        selectedCityId = null;
    });

    canvas.style.cursor = 'grab';
}

// 開始
init();