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

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
        showError('El archivo es demasiado grande. El tamaño máximo es 100MB.');
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

        updateProgress(data.progress, data.currentStep, data.status);

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
function updateProgress(progress, currentStep, status) {
    // Update progress bar
    progressFill.style.width = `${progress}%`;

    // Update progress text
    const stepTexts = {
        1: 'Convirtiendo video a audio...',
        2: 'Transcribiendo audio...',
        3: 'Traduciendo texto...',
        4: 'Generando audio traducido...',
        5: 'Sincronizando audio con video...'
    };

    progressText.textContent = stepTexts[currentStep] || 'Procesando...';

    // Update step indicators
    updateStepIndicators(currentStep);
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