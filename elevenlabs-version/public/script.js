// Variables globales
let selectedFile = null;
let currentProcessId = null;
let progressInterval = null;
let startTime = null;

// Elementos del DOM
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const processBtn = document.getElementById('processBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const timeModalBtn = document.getElementById('timeModalBtn');
const timeModal = document.getElementById('timeModal');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const creditsSection = document.getElementById('creditsSection');
const resultVideo = document.getElementById('resultVideo');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');

// Inicialización
document.addEventListener('DOMContentLoaded', function () {
    initializeEventListeners();
    checkCredits();
});

// Event Listeners
function initializeEventListeners() {
    // Upload area events
    uploadArea.addEventListener('click', () => videoInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // File input event
    videoInput.addEventListener('change', handleFileSelect);

    // Modal events
    timeModal.addEventListener('click', (e) => {
        if (e.target === timeModal) {
            closeTimeModal();
        }
    });

    // Keyboard events for modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && timeModal.style.display === 'block') {
            closeTimeModal();
        }
    });
}

// Drag and Drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// File selection handler
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// File handling
function handleFile(file) {
    if (!file.type.startsWith('video/')) {
        showError('Por favor selecciona un archivo de video válido.');
        return;
    }

    selectedFile = file;
    displayFileInfo(file);
    processBtn.disabled = false;
}

// Display file info
function displayFileInfo(file) {
    fileName.textContent = file.name;
    fileInfo.style.display = 'block';
    uploadArea.style.display = 'none';
}

// Remove file
function removeFile() {
    selectedFile = null;
    videoInput.value = '';
    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    processBtn.disabled = true;
}

// Process video
async function processVideo() {
    if (!selectedFile) {
        showError('Por favor selecciona un archivo de video.');
        return;
    }

    const targetLanguage = document.getElementById('targetLanguage').value;

    try {
        // Preparar formulario
        const formData = new FormData();
        formData.append('video', selectedFile);
        formData.append('targetLanguage', targetLanguage);

        // Mostrar progreso
        showProgress();
        startTime = Date.now();

        // Enviar archivo
        const response = await fetch('/api/process-video', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al procesar el video');
        }

        const data = await response.json();
        currentProcessId = data.processId;

        // Iniciar polling de progreso
        startProgressPolling();

    } catch (error) {
        console.error('Error processing video:', error);
        showError(error.message);
    }
}

// Show progress section
function showProgress() {
    hideAllSections();
    progressSection.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Iniciando doblaje...';
    timeModalBtn.style.display = 'none';

    // Reset steps
    step1.className = 'step active';
    step2.className = 'step';
}

// Start progress polling
function startProgressPolling() {
    if (progressInterval) {
        clearInterval(progressInterval);
    }

    progressInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/progress/${currentProcessId}`);

            if (!response.ok) {
                throw new Error('Error obteniendo progreso');
            }

            const data = await response.json();
            updateProgress(data);

            if (data.status === 'completed') {
                clearInterval(progressInterval);
                showResults(data.resultUrl);
            } else if (data.status === 'error') {
                clearInterval(progressInterval);
                showError(data.error);
            }

        } catch (error) {
            console.error('Error polling progress:', error);
            clearInterval(progressInterval);
            showError('Error obteniendo el progreso del doblaje');
        }
    }, 2000);
}

// Update progress
function updateProgress(data) {
    progressFill.style.width = `${data.progress}%`;
    progressText.textContent = data.message || 'Procesando...';

    // Update steps
    if (data.currentStep >= 1) {
        step1.className = 'step completed';
    }
    if (data.currentStep >= 2) {
        step2.className = 'step active';
    }

    // Show time modal button if we have time estimates
    if (data.timeEstimates && data.progress > 0) {
        timeModalBtn.style.display = 'inline-flex';
        updateTimeEstimates(data.timeEstimates);

        // Auto-open modal for real processing (not test)
        if (data.progress > 10 && timeModal.style.display === 'none') {
            autoOpenTimeModal();
        }
    }

    // Update progress message
    if (data.progressMessage) {
        progressText.textContent = data.progressMessage;
    }
}

// Update time estimates
function updateTimeEstimates(timeEstimates) {
    document.getElementById('elapsedTime').textContent = timeEstimates.elapsed || '--';
    document.getElementById('remainingTime').textContent = timeEstimates.remaining || '--';
    document.getElementById('completionTime').textContent = timeEstimates.completionTime || '--';
}

// Show results
function showResults(resultUrl) {
    hideAllSections();
    resultsSection.style.display = 'block';

    // Set video source
    resultVideo.src = resultUrl;
    resultVideo.load();

    // Store result URL for download
    resultVideo.dataset.downloadUrl = resultUrl;
}

// Download video
function downloadVideo() {
    const downloadUrl = resultVideo.dataset.downloadUrl;
    if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `dubbed_video_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Show error
function showError(message) {
    hideAllSections();
    errorSection.style.display = 'block';
    document.getElementById('errorMessage').textContent = message;

    if (progressInterval) {
        clearInterval(progressInterval);
    }
}

// Retry process
function retryProcess() {
    hideAllSections();
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    processBtn.disabled = true;
    selectedFile = null;
    videoInput.value = '';
}

// Hide all sections
function hideAllSections() {
    progressSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

// Time modal functions
function openTimeModal() {
    timeModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeTimeModal() {
    timeModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Check credits
async function checkCredits() {
    try {
        const response = await fetch('/api/credits');

        if (response.ok) {
            const credits = await response.json();
            displayCredits(credits);
        }
    } catch (error) {
        console.error('Error checking credits:', error);
        // Don't show error for credits, just hide the section
        creditsSection.style.display = 'none';
    }
}

// Display credits
function displayCredits(credits) {
    if (credits && credits.characterCount !== undefined) {
        document.getElementById('usedChars').textContent = credits.characterCount.toLocaleString();
        document.getElementById('charLimit').textContent = credits.characterLimit.toLocaleString();

        const available = credits.characterLimit - credits.characterCount;
        document.getElementById('availableChars').textContent = available.toLocaleString();

        creditsSection.style.display = 'block';
    } else {
        creditsSection.style.display = 'none';
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

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Auto-open time modal when processing starts
function autoOpenTimeModal() {
    // Auto-open modal after 5 seconds of processing
    setTimeout(() => {
        if (progressSection.style.display === 'block' && timeModalBtn.style.display !== 'none') {
            openTimeModal();
        }
    }, 5000);
} 