// Global variables
let selectedFile = null;
let processId = null;

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const processBtn = document.getElementById('processBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeDragAndDrop();
    initializeFileInput();
    // Manejar click del botón de subir video
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function (e) {
            e.stopPropagation(); // Evita burbujeo
            if (!selectedFile) {
                videoInput.click();
            }
        });
    }

    // Cargar voces de ElevenLabs al inicializar
    loadElevenLabsVoices();
});

// Drag and drop functionality
function initializeDragAndDrop() {
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    uploadArea.addEventListener('click', function () {
        if (!selectedFile) {
            videoInput.click();
        }
    });
}

// File input functionality
function initializeFileInput() {
    videoInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
}

// Handle file selection
function handleFileSelection(file) {
    // Validate file type
    if (!file.type.startsWith('video/')) {
        showError('Por favor selecciona un archivo de video válido.');
        return;
    }

    // Validate file size (max 5GB for long videos)
    if (file.size > 5 * 1024 * 1024 * 1024) {
        showError('El archivo es demasiado grande. El tamaño máximo es 5GB.');
        return;
    }

    selectedFile = file;
    displayFileInfo(file);
    enableProcessButton();
    hideError();
}

// Display file information
function displayFileInfo(file) {
    fileName.textContent = file.name;
    fileInfo.style.display = 'block';
    uploadArea.style.display = 'none';
}

// Remove selected file
function removeFile() {
    selectedFile = null;
    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    disableProcessButton();
    hideResults();
    hideError();
}

// Enable process button
function enableProcessButton() {
    processBtn.disabled = false;
}

// Disable process button
function disableProcessButton() {
    processBtn.disabled = true;
}

// Process video
async function processVideo() {
    if (!selectedFile) {
        showError('Por favor selecciona un archivo de video primero.');
        return;
    }

    const targetLanguage = document.getElementById('targetLanguage').value;
    const ttsProvider = document.getElementById('ttsProvider').value;
    const voiceId = document.getElementById('voiceSelector').value;
    const elevenLabsApiKey = document.getElementById('elevenLabsApiKey')?.value;

    // Show progress section
    showProgress();
    disableProcessButton();
    hideResults();
    hideError();

    try {
        // Create FormData
        const formData = new FormData();
        formData.append('video', selectedFile);
        formData.append('targetLanguage', targetLanguage);
        formData.append('ttsProvider', ttsProvider);
        if (voiceId) {
            formData.append('voiceId', voiceId);
        }
        if (ttsProvider === 'elevenlabs' && elevenLabsApiKey) {
            formData.append('elevenLabsApiKey', elevenLabsApiKey);
        }

        // Start processing
        const response = await fetch('/api/process-video', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        processId = data.processId;

        // Start polling for progress
        pollProgress();

    } catch (error) {
        console.error('Error processing video:', error);
        showError('Error al procesar el video: ' + error.message);
        hideProgress();
        enableProcessButton();
    }
}

// Poll for progress updates
async function pollProgress() {
    if (!processId) return;

    try {
        const response = await fetch(`/api/progress/${processId}`);
        const data = await response.json();



        updateProgress(data.progress, data.currentStep, data.status, data);

        if (data.status === 'completed') {
            showResults(data.resultUrl);
            hideProgress();
            enableProcessButton();
            if (data.durationMs) {
                const seconds = (data.durationMs / 1000).toFixed(1);
                document.getElementById('result').innerHTML += `<p>Tiempo total: <b>${seconds} segundos</b></p>`;
            }
        } else if (data.status === 'error') {
            showError(data.error || 'Error durante el procesamiento');
            hideProgress();
            enableProcessButton();
        } else {
            // Continue polling
            setTimeout(pollProgress, 1000);
        }

    } catch (error) {
        console.error('Error polling progress:', error);
        showError('Error al obtener el progreso: ' + error.message);
        hideProgress();
        enableProcessButton();
    }
}

// Update progress display
function updateProgress(progress, currentStep, status, data) {
    // Update progress bar
    progressFill.style.width = `${progress}%`;

    // Update progress text
    progressText.textContent = data.progressMessage || 'Procesando...';

    // Update step indicators
    updateStepIndicators(currentStep);

    // Update time estimates
    updateTimeEstimates(data);

    // Update chunk info for long videos
    updateChunkInfo(data);
}

// Update time estimates display
function updateTimeEstimates(data) {
    const timeModalBtn = document.getElementById('timeModalBtn');
    const elapsedTime = document.getElementById('elapsedTime');
    const remainingTime = document.getElementById('remainingTime');
    const completionTime = document.getElementById('completionTime');

    if (data.timeEstimates) {
        // Show the modal button
        timeModalBtn.style.display = 'flex';

        // Update the values in the modal
        elapsedTime.textContent = data.timeEstimates.elapsed || '--';
        remainingTime.textContent = data.timeEstimates.remaining || '--';
        completionTime.textContent = data.timeEstimates.completionTime || '--';

        // Auto-open modal on first time estimates (when processing starts)
        if (data.currentStep === 1 && data.progress > 0) {
            setTimeout(() => {
                openTimeModal();
            }, 1000); // Small delay to let the progress bar appear first
        }
    } else {
        timeModalBtn.style.display = 'none';
    }
}

// Update chunk info for long videos
function updateChunkInfo(data) {
    const chunkInfo = document.getElementById('chunkInfo');
    const currentChunk = document.getElementById('currentChunk');
    const totalChunks = document.getElementById('totalChunks');

    if (data.isLongVideo && data.totalChunks > 1) {
        chunkInfo.style.display = 'block';
        currentChunk.textContent = data.currentChunk || '--';
        totalChunks.textContent = data.totalChunks || '--';
    } else {
        chunkInfo.style.display = 'none';
    }
}

// Update step indicators
function updateStepIndicators(currentStep) {
    const steps = document.querySelectorAll('.step');

    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');

        if (index + 1 < currentStep) {
            step.classList.add('completed');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
        }
    });
}

// Show progress section
function showProgress() {
    progressSection.style.display = 'block';
    progressSection.classList.add('fade-in');

    // Initialize time modal button
    const timeModalBtn = document.getElementById('timeModalBtn');
    timeModalBtn.style.display = 'none';
}

// Hide progress section
function hideProgress() {
    progressSection.style.display = 'none';
}

// Show results
function showResults(videoUrl) {
    const resultVideo = document.getElementById('resultVideo');
    resultVideo.src = videoUrl;
    resultsSection.style.display = 'block';
    resultsSection.classList.add('fade-in');
}

// Hide results
function hideResults() {
    resultsSection.style.display = 'none';
}

// Show error
function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    errorSection.classList.add('fade-in');
}

// Hide error
function hideError() {
    errorSection.style.display = 'none';
}

// Download video
function downloadVideo() {
    const resultVideo = document.getElementById('resultVideo');
    const videoUrl = resultVideo.src;

    if (videoUrl) {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `video_traducido_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// Retry process
function retryProcess() {
    hideError();
    if (selectedFile) {
        processVideo();
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add loading animation to buttons
function addLoadingAnimation(button) {
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    button.disabled = true;
}

function removeLoadingAnimation(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
}



// Open time modal
function openTimeModal() {
    const timeModal = document.getElementById('timeModal');
    timeModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Close time modal
function closeTimeModal() {
    const timeModal = document.getElementById('timeModal');
    timeModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function () {
    const timeModal = document.getElementById('timeModal');

    timeModal.addEventListener('click', function (e) {
        if (e.target === timeModal) {
            closeTimeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && timeModal.style.display === 'block') {
            closeTimeModal();
        }
    });
});

// Funciones para manejar voces de ElevenLabs
let elevenLabsVoices = [];

// Cargar voces de ElevenLabs
async function loadElevenLabsVoices() {
    try {
        const response = await fetch('/api/elevenlabs-voices');
        const data = await response.json();

        if (data.voices) {
            elevenLabsVoices = data.voices;
            hideVoiceWarning();
            showVoiceInfoMessage();
        } else if (data.fallbackVoices) {
            elevenLabsVoices = data.fallbackVoices;
            showVoiceWarning();
            hideVoiceInfoMessage();
        }

        populateVoiceSelector();
    } catch (error) {
        console.error('Error cargando voces de ElevenLabs:', error);
        // Usar voces por defecto si hay error
        elevenLabsVoices = [
            // Voces en Inglés
            { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade', labels: { language: 'en' } },
            { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade', labels: { language: 'en' } },
            { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade', labels: { language: 'en' } },
            { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'en' } },
            { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Josh', category: 'premade', labels: { language: 'en' } },
            { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade', labels: { language: 'en' } },
            { voice_id: 'ThT5KcBeYPX3keUQqHPh', name: 'Antoni', category: 'premade', labels: { language: 'en' } },

            // Voces en Español
            { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade', labels: { language: 'es' } },
            { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'es' } },

            // Voces en Francés
            { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Josh', category: 'premade', labels: { language: 'fr' } },
            { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'fr' } },

            // Voces en Alemán
            { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade', labels: { language: 'de' } },
            { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'de' } },

            // Voces en Italiano
            { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade', labels: { language: 'it' } },
            { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'it' } },

            // Voces en Portugués
            { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'pt' } },

            // Voces en Japonés
            { voice_id: 'ThT5KcBeYPX3keUQqHPh', name: 'Antoni', category: 'premade', labels: { language: 'ja' } },
            { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Sam', category: 'premade', labels: { language: 'ja' } }
        ];
        populateVoiceSelector();
    }
}

// Poblar el selector de voces
function populateVoiceSelector() {
    const voiceSelector = document.getElementById('voiceSelector');
    voiceSelector.innerHTML = '<option value="">Seleccionar voz automáticamente</option>';

    // Si tenemos voces reales de ElevenLabs, mostrarlas todas juntas
    if (elevenLabsVoices.length > 0 && elevenLabsVoices[0].voice_id) {
        // Ordenar voces por categoría y nombre
        const sortedVoices = [...elevenLabsVoices].sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            return a.name.localeCompare(b.name);
        });

        // Agrupar por categoría
        const voicesByCategory = {};
        sortedVoices.forEach(voice => {
            const category = voice.category || 'premade';
            if (!voicesByCategory[category]) {
                voicesByCategory[category] = [];
            }
            voicesByCategory[category].push(voice);
        });

        // Agregar voces agrupadas por categoría
        Object.keys(voicesByCategory).sort().forEach(category => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = `${category.charAt(0).toUpperCase() + category.slice(1)} (${voicesByCategory[category].length} voces)`;

            voicesByCategory[category].forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.voice_id;
                option.textContent = voice.description || `${voice.name}${voice.accent ? ` (${voice.accent})` : ''}`;
                option.dataset.voice = JSON.stringify(voice);
                optgroup.appendChild(option);
            });

            voiceSelector.appendChild(optgroup);
        });
    } else {
        // Fallback: agrupar por idioma
        const voicesByLanguage = {};
        elevenLabsVoices.forEach(voice => {
            const language = voice.language || voice.labels?.language || 'en';
            if (!voicesByLanguage[language]) {
                voicesByLanguage[language] = [];
            }
            voicesByLanguage[language].push(voice);
        });

        Object.keys(voicesByLanguage).sort().forEach(language => {
            const languageName = getLanguageName(language);
            const optgroup = document.createElement('optgroup');
            optgroup.label = `${languageName} (${voicesByLanguage[language].length} voces)`;

            voicesByLanguage[language].forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.voice_id;
                option.textContent = voice.displayName || `${voice.name} (${voice.category})`;
                option.dataset.voice = JSON.stringify(voice);
                optgroup.appendChild(option);
            });

            voiceSelector.appendChild(optgroup);
        });
    }

    // Agregar evento para mostrar información de la voz seleccionada
    voiceSelector.addEventListener('change', showVoiceInfo);
}

// Obtener nombre del idioma
function getLanguageName(languageCode) {
    const languageNames = {
        'en': 'Inglés',
        'es': 'Español',
        'fr': 'Francés',
        'de': 'Alemán',
        'it': 'Italiano',
        'pt': 'Portugués',
        'ja': 'Japonés',
        'ko': 'Coreano',
        'zh': 'Chino',
        'ru': 'Ruso',
        'ar': 'Árabe',
        'hi': 'Hindi'
    };
    return languageNames[languageCode] || languageCode;
}

// Manejar cambio de proveedor TTS
function onTTSProviderChange() {
    const ttsProvider = document.getElementById('ttsProvider').value;
    const voiceSelectorGroup = document.getElementById('voiceSelectorGroup');
    const elevenLabsApiKeyGroup = document.getElementById('elevenLabsApiKeyGroup');

    if (ttsProvider === 'elevenlabs') {
        voiceSelectorGroup.classList.add('show');
        voiceSelectorGroup.style.display = '';
        elevenLabsApiKeyGroup.style.display = '';
    } else {
        voiceSelectorGroup.classList.remove('show');
        voiceSelectorGroup.style.display = 'none';
        elevenLabsApiKeyGroup.style.display = 'none';
        hideVoiceInfo();
    }
}

// Mostrar información de la voz seleccionada
function showVoiceInfo() {
    const voiceSelector = document.getElementById('voiceSelector');
    const voiceInfo = document.getElementById('voiceInfo');
    const voiceCategory = document.getElementById('voiceCategory');
    const voiceLanguage = document.getElementById('voiceLanguage');
    const voiceAccent = document.getElementById('voiceAccent');

    if (voiceSelector.value) {
        try {
            const voice = JSON.parse(voiceSelector.selectedOptions[0].dataset.voice);

            voiceCategory.textContent = voice.category || 'premade';

            // Para voces reales de ElevenLabs, mostrar que pueden hablar en cualquier idioma
            if (voice.voice_id && voice.voice_id.length > 10) {
                voiceLanguage.textContent = 'Multilingüe (cualquier idioma)';
            } else {
                voiceLanguage.textContent = getLanguageName(voice.language || voice.labels?.language || 'en');
            }

            if (voice.accent || voice.labels?.accent) {
                voiceAccent.textContent = ` • ${voice.accent || voice.labels.accent}`;
                voiceAccent.style.display = 'inline';
            } else {
                voiceAccent.style.display = 'none';
            }

            voiceInfo.style.display = 'block';
        } catch (error) {
            console.error('Error parsing voice data:', error);
            hideVoiceInfo();
        }
    } else {
        hideVoiceInfo();
    }
}

// Ocultar información de la voz
function hideVoiceInfo() {
    document.getElementById('voiceInfo').style.display = 'none';
}

// Mostrar advertencia de voces limitadas
function showVoiceWarning() {
    document.getElementById('voiceWarning').style.display = 'block';
}

// Ocultar advertencia de voces limitadas
function hideVoiceWarning() {
    document.getElementById('voiceWarning').style.display = 'none';
}

// Mostrar mensaje informativo de voces reales
function showVoiceInfoMessage() {
    document.getElementById('voiceInfoMessage').style.display = 'block';
}

// Ocultar mensaje informativo de voces reales
function hideVoiceInfoMessage() {
    document.getElementById('voiceInfoMessage').style.display = 'none';
} 