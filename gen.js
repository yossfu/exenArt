// Configuración inicial
const apiKey = "PS5YKftW6kiygdSsdT0VLw"; // Clave API fija como en tu código funcional
let selectedLoras = [];
let selectedModel = "Flux.1-Schnell fp8 (Compact)"; // Modelo por defecto
let useLCM = false;

// Lista de modelos compatibles con AI Horde (mantenemos la misma lista)
const models = [
    { value: "Flux.1-Schnell fp8 (Compact)", name: "Flux.1 Schnell", img: "https://via.placeholder.com/100" },
    { value: "AlbedoBase XL (SDXL)", name: "AlbedoBase XL", img: "https://via.placeholder.com/100" },
    { value: "ICBINP - I Can't Believe It's Not Photography", name: "ICBINP", img: "https://via.placeholder.com/100" },
    { value: "ponyreal", name: "Pony Realism", img: "https://via.placeholder.com/100" },
    { value: "AMPonyXL", name: "AMPonyXL", img: "https://via.placeholder.com/100" },
    { value: "Pony Diffusion XL", name: "Pony Diffusion XL", img: "https://via.placeholder.com/100" },
    { value: "Stable Diffusion 1.5", name: "Stable Diffusion 1.5", img: "https://via.placeholder.com/100" },
    { value: "DreamShaper", name: "DreamShaper", img: "https://via.placeholder.com/100" },
    { value: "Anything V5", name: "Anything V5", img: "https://via.placeholder.com/100" },
    { value: "Stable Diffusion 3", name: "Stable Diffusion 3", img: "https://via.placeholder.com/100" },
    { value: "Realistic Vision", name: "Realistic Vision", img: "https://via.placeholder.com/100" },
    { value: "Juggernaut XL", name: "Juggernaut XL", img: "https://via.placeholder.com/100" },
    { value: "Anime Diffusion", name: "Anime Diffusion", img: "https://via.placeholder.com/100" },
    { value: "CyberRealistic", name: "CyberRealistic", img: "https://via.placeholder.com/100" },
    { value: "Furry Diffusion", name: "Furry Diffusion", img: "https://via.placeholder.com/100" }
];

// Obtener valores del formulario
function getFormValues() {
    let param = {};
    let requestData = {};
    let width, height;
    
    const resolution = document.getElementById('size').value;
    let input = document.getElementById('promptInput').value;
    const negativePrompt = document.getElementById('negativePrompt').value;
    const sampler = document.getElementById('sampler').value;
    const steps = parseInt(document.getElementById('steps').value);
    const cfgScale = parseFloat(document.getElementById('cfgScale').value);
    const seed = document.getElementById('seedInput').value;

    switch(resolution) {
        case "Portrait": width = 768; height = 1280; break;
        case "Landscape": width = 1280; height = 768; break;
        case "Square": width = 1024; height = 1024; break;
        default: width = 1024; height = 1024;
    }
    
    param.steps = isNaN(steps) ? (useLCM ? 3 : 4) : steps;
    param.cfg_scale = isNaN(cfgScale) ? 7.5 : cfgScale;
    param.sampler_name = sampler || (useLCM ? "lcm" : "k_euler");
    param.height = height;
    param.width = width;
    param.n = 1;

    if (seed) param.seed = parseInt(seed);

    switch(selectedModel) {
        case "Flux.1-Schnell fp8 (Compact)":
            param.karras = false;
            break;
        case "AlbedoBase XL (SDXL)":
            param.karras = true;
            break;
        case "ICBINP - I Can't Believe It's Not Photography":
            param.clip_skip = 1;
            param.hires_fix = true;
            param.karras = true;
            break;
        case "AMPonyXL":
            param.clip_skip = 2;
            input = "score_9, score_8_up, score_7_up, source_anime, BREAK, " + input;
            break;
        case "Pony Diffusion XL":
            param.clip_skip = 2;
            input = "score_9, score_8_up, score_7_up, " + input;
            break;
        case "ponyreal":
            param.clip_skip = 2;
            param.karras = true;
            param.post_processing = ["RealESRGAN_x2plus"];
            input = "score_9, score_8_up, score_7_up, BREAK, " + input;
            break;
        case "Stable Diffusion 1.5":
            param.karras = true;
            break;
        case "DreamShaper":
            param.karras = true;
            break;
        case "Anything V5":
            input = "anime style, " + input;
            break;
        case "Stable Diffusion 3":
            param.karras = true;
            param.hires_fix = true;
            break;
        case "Realistic Vision":
            param.karras = true;
            param.post_processing = ["RealESRGAN_x4plus"];
            break;
        case "Juggernaut XL":
            param.karras = true;
            break;
        case "Anime Diffusion":
            input = "anime style, " + input;
            param.karras = true;
            break;
        case "CyberRealistic":
            param.karras = true;
            param.post_processing = ["RealESRGAN_x4plus"];
            break;
        case "Furry Diffusion":
            input = "furry art, " + input;
            param.karras = true;
            break;
    }
    
    if (selectedLoras.length > 0) {
        param.loras = selectedLoras.map(lora => ({
            name: lora.name,
            model: lora.weight || 0.8,
            clip: lora.weight || 0.8,
            ...(lora.versionId && { version_id: lora.versionId, is_version: true })
        }));
        const loraIdsInPrompt = selectedLoras.map(l => `<lora:${l.versionId || l.id}>`).join(', ');
        if (loraIdsInPrompt) input = `${input}, ${loraIdsInPrompt}`.trim();
    }

    requestData.prompt = input.trim() || "A beautiful landscape";
    if (negativePrompt && negativePrompt.trim()) requestData.negative_prompt = negativePrompt.trim();
    requestData.nsfw = true;
    requestData.models = [selectedModel];
    requestData.params = param;
    requestData.allow_downgrade = true;

    return requestData;
}

// Mostrar estado de carga
function setGridLoading(isLoading) {
    const progressContainer = document.getElementById('progressContainer');
    const imageResults = document.getElementById('imageResults');
    if (progressContainer && imageResults) {
        progressContainer.style.display = isLoading ? 'block' : 'none';
        imageResults.innerHTML = '';
        imageResults.style.display = isLoading ? 'none' : 'block';
    } else {
        console.error('No se encontraron los elementos #progressContainer o #imageResults');
    }
}

// Actualizar barra de progreso
function updateProgressBar(percentage, text) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    if (progressBar && progressText) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        progressText.textContent = text || `Generando... (${Math.round(percentage)}%)`;
    } else {
        console.error('No se encontraron los elementos #progressBar o #progressText');
    }
}

// Generar imagen
async function generateImage(e) {
    e.preventDefault();
    const button = document.getElementById('generateBtn');
    const imageResults = document.getElementById('imageResults');
    
    button.disabled = true;
    setGridLoading(true);
    updateProgressBar(0, 'Iniciando generación...');

    try {
        const requestData = getFormValues();
        
        if (!requestData.prompt?.trim()) {
            imageResults.innerHTML = '<p class="text-center text-danger">Por favor, ingresa un prompt</p>';
            button.disabled = false;
            setGridLoading(false);
            return;
        }

        console.log('Clave API utilizada:', apiKey);
        console.log('Datos enviados a AI Horde:', JSON.stringify(requestData, null, 2));

        const response = await fetch('https://aihorde.net/api/v2/generate/async', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Respuesta de la API:', data);

        if (!data.id) {
            throw new Error('No se recibió un ID de generación del servidor');
        }

        console.log('Solicitud de generación exitosa, ID:', data.id);
        await checkStatus(data.id);

    } catch (error) {
        console.error('Error en la generación:', error);
        imageResults.innerHTML = `<p class="text-center text-danger">Error: ${error.message}</p>`;
        button.disabled = false;
        setGridLoading(false);
    }
}

// Verificar estado de la generación con barra de progreso
async function checkStatus(id) {
    const button = document.getElementById('generateBtn');
    const imageResults = document.getElementById('imageResults');
    let attempts = 0;
    const maxAttempts = 60;
    let initialWaitTime = null;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`https://aihorde.net/api/v2/generate/check/${id}`, {
                headers: { 'apikey': apiKey }
            });

            if (!response.ok) {
                throw new Error(`Fallo al verificar estado: ${response.status}`);
            }

            const status = await response.json();
            console.log('Estado actual:', status);

            if (status.finished) {
                updateProgressBar(100, 'Finalizado');
                const generations = await getResults(id);
                if (generations) {
                    displayResults(generations);
                    saveGenerations(generations);
                } else {
                    imageResults.innerHTML = '<p class="text-center text-danger">No se generaron imágenes válidas</p>';
                }
                button.disabled = false;
                setGridLoading(false);
                return;
            }

            if (initialWaitTime === null) initialWaitTime = status.wait_time || 60;
            const remainingTime = status.wait_time || (initialWaitTime - attempts * 2);
            const progress = Math.min(99, Math.max(0, ((initialWaitTime - remainingTime) / initialWaitTime) * 100));
            updateProgressBar(progress);

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error('Error al verificar estado:', error);
            imageResults.innerHTML = `<p class="text-center text-danger">Error verificando estado: ${error.message}</p>`;
            button.disabled = false;
            setGridLoading(false);
            return;
        }
    }

    imageResults.innerHTML = '<p class="text-center text-danger">Tiempo agotado: La generación tomó demasiado tiempo</p>';
    button.disabled = false;
    setGridLoading(false);
}

// Obtener resultados
async function getResults(id) {
    try {
        const response = await fetch(`https://aihorde.net/api/v2/generate/status/${id}`, {
            headers: { 'apikey': apiKey }
        });

        if (!response.ok) {
            throw new Error(`Fallo al obtener resultados: ${response.status}`);
        }

        const data = await response.json();
        console.log('Resultados de generación:', data);

        if (!data.generations || data.generations.length === 0) {
            throw new Error('No se encontraron generaciones en la respuesta');
        }

        return data.generations;
    } catch (error) {
        console.error('Error al obtener resultados:', error);
        document.getElementById('imageResults').innerHTML = 
            `<p class="text-center text-danger">Error obteniendo resultados: ${error.message}</p>`;
        return null;
    }
}

// Mostrar resultados
function displayResults(generations) {
    const imageResults = document.getElementById('imageResults');
    imageResults.innerHTML = '';

    if (generations && generations.length > 0) {
        generations.forEach((gen, index) => {
            const div = document.createElement('div');
            div.className = 'image-container';
            div.innerHTML = `
                <img src="${gen.img}" alt="Imagen ${index + 1}" onload="this.style.display='block'" style="display:none">
                <button class="btn btn-sm btn-secondary mt-1" onclick="downloadImage('${gen.img}', 'image_${index}.png')">Descargar</button>
            `;
            imageResults.appendChild(div);
        });
    } else {
        imageResults.innerHTML = '<p class="text-center">No se generaron imágenes.</p>';
    }
}

// Descargar imagen
function downloadImage(url, filename) {
    fetch(url).then(r => r.blob()).then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    });
}

// Guardar generaciones
function saveGenerations(generations) {
    if (!generations) return;
    const saved = JSON.parse(localStorage.getItem('savedGenerations') || '[]');
    const newSaved = generations.map(gen => ({
        img: gen.img,
        prompt: document.getElementById('promptInput').value,
        negativePrompt: document.getElementById('negativePrompt').value,
        model: selectedModel,
        seed: document.getElementById('seedInput').value || 'random',
        loras: selectedLoras.map(l => `${l.id}:${l.weight}${l.versionId ? ` (v${l.versionId})` : ''}`).join(', '),
        timestamp: new Date().toISOString()
    }));
    localStorage.setItem('savedGenerations', JSON.stringify([...newSaved, ...saved]));
}

// Mostrar generaciones guardadas con visor
function displaySavedGenerations() {
    const grid = document.getElementById('saved-images');
    const saved = JSON.parse(localStorage.getItem('savedGenerations') || '[]');
    grid.innerHTML = '';
    saved.forEach((gen, index) => {
        const div = document.createElement('div');
        div.className = 'image-container';
        div.innerHTML = `
            <img src="${gen.img}" alt="Imagen ${index + 1}" class="history-image" data-index="${index}">
        `;
        div.querySelector('.history-image').addEventListener('click', () => openImageViewer(gen));
        grid.appendChild(div);
    });
}

// Abrir visor de imágenes
function openImageViewer(gen) {
    const viewerModal = new bootstrap.Modal(document.getElementById('imageViewerModal'));
    const viewerImage = document.getElementById('viewerImage');
    const viewerDetails = document.getElementById('viewerDetails');
    const downloadBtn = document.getElementById('downloadViewerBtn');

    viewerImage.src = gen.img;
    viewerDetails.innerHTML = `
        <strong>Prompt:</strong> ${gen.prompt}<br>
        <strong>Negativo:</strong> ${gen.negativePrompt || 'Ninguno'}<br>
        <strong>Modelo:</strong> ${gen.model}<br>
        <strong>Seed:</strong> ${gen.seed}<br>
        <strong>LoRAs:</strong> ${gen.loras || 'Ninguno'}<br>
        <strong>Fecha:</strong> ${new Date(gen.timestamp).toLocaleString()}
    `;
    downloadBtn.onclick = () => downloadImage(gen.img, `image_${gen.timestamp}.png`);

    viewerModal.show();
}

// Eliminar historial
function clearHistory() {
    localStorage.removeItem('savedGenerations');
    displaySavedGenerations();
}

// Buscar LoRAs
async function searchLoras(query) {
    try {
        const response = await fetch(`https://civitai.com/api/v1/models?types=LORA&query=${encodeURIComponent(query)}&limit=20&nsfw=true`);
        const data = await response.json();
        return data.items.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || 'Sin descripción',
            thumbnail: item.modelVersions?.[0]?.images?.[0]?.url || 'https://via.placeholder.com/80',
            tags: item.modelVersions?.[0]?.trainedWords || ['Sin tags'],
            versions: item.modelVersions.map(v => ({
                id: v.id,
                name: v.name || `Versión ${v.id}`,
                trainedWords: v.trainedWords || []
            }))
        }));
    } catch (error) {
        console.error('Error buscando LoRAs:', error);
        return [];
    }
}

// Buscar modelos
function searchModels(query) {
    return models.filter(model => model.name.toLowerCase().includes(query.toLowerCase()));
}

// Mostrar modelos en el modal
function displayModelGrid(models) {
    const grid = document.getElementById('modelGrid');
    grid.innerHTML = '';
    models.forEach(model => {
        const div = document.createElement('div');
        div.className = 'model-card';
        div.innerHTML = `
            <img src="${model.img}" alt="${model.name}">
            <span>${model.name}</span>
            <button class="btn-select" data-value="${model.value}">Seleccionar</button>
        `;
        div.querySelector('.btn-select').addEventListener('click', () => {
            selectedModel = model.value;
            updateModelDisplay();
            bootstrap.Modal.getInstance(document.getElementById('modelModal')).hide();
        });
        grid.appendChild(div);
    });
}

// Actualizar visualización del modelo seleccionado
function updateModelDisplay() {
    const card = document.getElementById('selectedModelCard');
    const model = models.find(m => m.value === selectedModel);
    card.querySelector('img').src = model.img;
    card.querySelector('#selectedModelDisplay').textContent = model.name;
}

// Mostrar LoRAs en el modal
function displayLoraModalGrid(loras) {
    const grid = document.getElementById('loraModalGrid');
    grid.innerHTML = '';
    loras.forEach(lora => {
        const div = document.createElement('div');
        div.className = `lora-modal-item ${selectedLoras.some(s => s.id === lora.id) ? 'selected' : ''}`;
        div.innerHTML = `
            <img src="${lora.thumbnail}" alt="${lora.name}">
            <small>${lora.name}</small>
            <select class="version-select" data-lora-id="${lora.id}">
                <option value="">Última versión</option>
                ${lora.versions.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
            </select>
            <div class="lora-details">
                <strong>Tags:</strong><br>
                ${lora.tags.map(t => `<button class="tag-btn" data-tag="${t}">${t}</button>`).join(' ')}
                <br><strong>Descripción:</strong><br> ${lora.description}
            </div>
        `;
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tag-btn') && !e.target.classList.contains('version-select')) {
                toggleLoraSelection(lora);
            }
        });
        div.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', () => addTagToPrompt(btn.dataset.tag));
        });
        const versionSelect = div.querySelector('.version-select');
        versionSelect.addEventListener('change', (e) => {
            const loraIndex = selectedLoras.findIndex(s => s.id === lora.id);
            if (loraIndex >= 0) {
                selectedLoras[loraIndex].versionId = e.target.value || undefined;
                displaySelectedLoras();
            }
        });
        grid.appendChild(div);
    });
}

// Añadir tag al prompt
function addTagToPrompt(tag) {
    const prompt = document.getElementById('promptInput');
    prompt.value = prompt.value.trim() ? `${prompt.value}, ${tag}` : tag;
}

// Seleccionar/deseleccionar LoRA
function toggleLoraSelection(lora) {
    const index = selectedLoras.findIndex(s => s.id === lora.id);
    if (index >= 0) {
        selectedLoras.splice(index, 1);
    } else if (selectedLoras.length < 4) {
        selectedLoras.push({ ...lora, weight: 0.8, versionId: undefined });
    } else {
        alert('Máximo 4 LoRAs permitidos.');
    }
    updateLoraModal();
    displaySelectedLoras();
}

// Actualizar modal de LoRAs
function updateLoraModal() {
    const items = document.querySelectorAll('#loraModalGrid .lora-modal-item');
    items.forEach(item => {
        const itemName = item.querySelector('small').textContent;
        item.classList.toggle('selected', selectedLoras.some(l => l.name === itemName));
        const versionSelect = item.querySelector('.version-select');
        const lora = selectedLoras.find(s => s.id === parseInt(versionSelect.dataset.loraId));
        versionSelect.value = lora?.versionId || '';
    });
}

// Mostrar LoRAs seleccionados
function displaySelectedLoras() {
    const list = document.getElementById('loraSelectedList');
    list.innerHTML = '';
    selectedLoras.forEach((lora, i) => {
        const div = document.createElement('div');
        div.className = 'lora-selected-item';
        div.innerHTML = `
            <button class="lora-remove-btn" data-index="${i}">X</button>
            <img src="${lora.thumbnail}" alt="${lora.name}">
            <small>${lora.name} ${lora.versionId ? `(v${lora.versionId})` : ''}</small>
            <input type="range" min="0" max="1" step="0.1" value="${lora.weight}" data-index="${i}">
        `;
        div.querySelector('input').addEventListener('input', e => {
            selectedLoras[i].weight = parseFloat(e.target.value);
        });
        div.querySelector('.lora-remove-btn').addEventListener('click', () => {
            selectedLoras.splice(i, 1);
            displaySelectedLoras();
        });
        list.appendChild(div);
    });
}

// Event listeners al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.addEventListener('click', generateImage);
    generateBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        generateImage(e);
    });

    document.getElementById('promptInput').addEventListener('input', e => {
        generateBtn.disabled = !e.target.value.trim();
    });

    document.getElementById('selectedModelCard').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('modelModal')).show();
        displayModelGrid(models);
    });

    document.getElementById('steps').addEventListener('input', e => {
        document.getElementById('stepsValue').textContent = e.target.value;
    });

    document.getElementById('cfgScale').addEventListener('input', e => {
        document.getElementById('cfgValue').textContent = e.target.value;
    });

    document.getElementById('loraSearch').addEventListener('input', () => {
        clearTimeout(window.loraTimer);
        document.getElementById('loraModalGrid').innerHTML = '<p class="text-center">Buscando...</p>';
        window.loraTimer = setTimeout(async () => {
            const query = document.getElementById('loraSearch').value.trim();
            if (query.length > 2) {
                const loras = await searchLoras(query);
                displayLoraModalGrid(loras);
            } else {
                document.getElementById('loraModalGrid').innerHTML = '<p class="text-center">Escribe al menos 3 caracteres.</p>';
            }
        }, 500);
    });

    document.getElementById('loraModalConfirm').addEventListener('click', () => {
        bootstrap.Modal.getInstance(document.getElementById('loraModal')).hide();
    });

    document.getElementById('historyModal').addEventListener('shown.bs.modal', displaySavedGenerations);
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar el historial?')) {
            clearHistory();
        }
    });

    document.getElementById('modelSearch').addEventListener('input', () => {
        clearTimeout(window.modelTimer);
        window.modelTimer = setTimeout(() => {
            const query = document.getElementById('modelSearch').value.trim();
            const filteredModels = searchModels(query);
            displayModelGrid(filteredModels);
        }, 500);
    });

    document.getElementById('useLCM').addEventListener('change', (e) => {
        useLCM = e.target.checked;
        document.getElementById('steps').value = useLCM ? 3 : 4;
        document.getElementById('stepsValue').textContent = useLCM ? 3 : 4;
        document.getElementById('sampler').value = useLCM ? "lcm" : "k_euler";
    });

    updateModelDisplay();
});