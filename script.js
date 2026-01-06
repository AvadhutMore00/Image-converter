/**
 * Image Converter Logic
 * Handles file upload, preview, canvas conversion, and UI updates.
 */

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const editorArea = document.getElementById('editor-area');
const resultArea = document.getElementById('result-area');
const imagePreview = document.getElementById('image-preview');
const fileNameDisplay = document.getElementById('file-name');
const fileSizeDisplay = document.getElementById('file-size');
const removeBtn = document.getElementById('remove-btn');
const convertBtn = document.getElementById('convert-btn');
const formatSelect = document.getElementById('format-select');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const qualityGroup = document.getElementById('quality-group');
const newSizeDisplay = document.getElementById('new-size');
const savedPercentageDisplay = document.getElementById('saved-percentage');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const errorToast = document.getElementById('error-toast');
const errorMessage = document.getElementById('error-message');
const themeToggle = document.getElementById('theme-toggle');

// State
let originalImage = null; // Image Object
let originalFile = null;  // File Object
let isConverting = false;

// Constants
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
const MAX_SIZE_MB = 15; // Limit to 15MB to prevent browser crashes

// --- Theme Management ---
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    const icon = themeToggle.querySelector('i');
    if (newTheme === 'dark') {
        icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
    }
});

// Set initial icon
if (savedTheme === 'dark') {
    themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
}


// --- Event Listeners ---

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// File Input
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

// Quality Slider Update
qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value;
});

// Format Change (Show/Hide Quality for PNG)
formatSelect.addEventListener('change', (e) => {
    // PNG is lossless, so quality slider doesn't apply the same way in toDataURL
    // But most browsers ignore it for image/png. We'll leave it visible but maybe dim it
    // or just let it stay as a placebo for consistent UI, though functionality differs.
    // For this demo, let's keep it simple.
});

// Remove Image
removeBtn.addEventListener('click', resetUI);

// Reset App
resetBtn.addEventListener('click', resetUI);

// Convert Action
convertBtn.addEventListener('click', convertImage);


// --- Core Functions ---

function handleFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
        showError('Unsupported file format. Please use JPG, PNG, WEBP, or BMP.');
        return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        showError(`File too large. Max size is ${MAX_SIZE_MB}MB.`);
        return;
    }

    originalFile = file;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        originalImage = new Image();
        originalImage.src = e.target.result;
        originalImage.onload = () => {
            // Show Editor
            dropZone.classList.add('hidden');
            editorArea.classList.remove('hidden');
            
            // Populate Details
            imagePreview.src = e.target.result;
            fileNameDisplay.textContent = file.name;
            fileSizeDisplay.textContent = formatBytes(file.size);
        };
        originalImage.onerror = () => {
            showError('Failed to load image.');
        };
    };
    
    reader.readAsDataURL(file);
}

function convertImage() {
    if (!originalImage || isConverting) return;
    
    isConverting = true;
    const originalBtnText = convertBtn.innerHTML;
    convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Converting...';
    convertBtn.disabled = true;

    // Small timeout to allow UI to update (spinner) before heavy canvas op
    setTimeout(() => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            
            // Draw white background for transparency handling (optional, good for converting PNG transparent to JPG)
            // If output is PNG/WEBP, we might want to keep transparency.
            // For now, let's keep transparency unless it's JPG.
            const targetFormat = formatSelect.value;
            
            if (targetFormat === 'image/jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.drawImage(originalImage, 0, 0);
            
            const quality = parseFloat(qualitySlider.value);
            const dataUrl = canvas.toDataURL(targetFormat, quality);
            
            // Calculate size diff
            // Base64 length * 0.75 is approx file size in bytes
            const head = 'data:' + targetFormat + ';base64,';
            const sizeInBytes = Math.round((dataUrl.length - head.length) * 3 / 4);
            
            showSuccess(dataUrl, sizeInBytes, targetFormat);
            
        } catch (err) {
            console.error(err);
            showError('Conversion failed. Please try a different image.');
        } finally {
            isConverting = false;
            convertBtn.innerHTML = originalBtnText;
            convertBtn.disabled = false;
        }
    }, 100);
}

function showSuccess(dataUrl, newSize, format) {
    editorArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    
    newSizeDisplay.textContent = formatBytes(newSize);
    
    // Calculate percentage saved (or increased)
    const oldSize = originalFile.size;
    let percent = 0;
    
    if (newSize < oldSize) {
        percent = Math.round(((oldSize - newSize) / oldSize) * 100);
        savedPercentageDisplay.textContent = `${percent}% Smaller`;
        savedPercentageDisplay.style.color = '#10b981'; // Green
    } else {
        percent = Math.round(((newSize - oldSize) / oldSize) * 100);
        savedPercentageDisplay.textContent = `${percent}% Larger`;
        savedPercentageDisplay.style.color = '#f59e0b'; // Orange/Warning color for larger files
    }
    
    // Set up download button
    const ext = format.split('/')[1];
    const originalName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.'));
    downloadBtn.href = dataUrl;
    downloadBtn.download = `${originalName}_converted.${ext}`;
}

function resetUI() {
    originalImage = null;
    originalFile = null;
    fileInput.value = '';
    
    dropZone.classList.remove('hidden');
    editorArea.classList.add('hidden');
    resultArea.classList.add('hidden');
    errorToast.classList.add('hidden');
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorToast.classList.remove('hidden');
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        errorToast.classList.add('hidden');
    }, 3500);
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initialize
resetUI();
