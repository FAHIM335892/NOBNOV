// ===== Configuration =====
const CANVAS_SIZE = 1080; // Output image size (matching the frame)

// Ellipse mask configuration (based on the frame's white oval area)
const ELLIPSE_CENTER_X = 540;  // Center X of the ellipse
const ELLIPSE_CENTER_Y = 340;  // Center Y (positioned higher for the new frame)
const ELLIPSE_RADIUS_X = 480;  // Horizontal radius (wider)
const ELLIPSE_RADIUS_Y = 420;  // Vertical radius (taller)

// ===== State =====
let state = {
  image: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  lastOffsetX: 0,
  lastOffsetY: 0,
  frameImage: null
};

// ===== DOM Elements =====
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const previewCanvas = document.getElementById('previewCanvas');
const ctx = previewCanvas.getContext('2d');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const changePhotoBtn = document.getElementById('changePhotoBtn');

// ===== Initialize =====
async function init() {
  // Preload frame asset
  state.frameImage = await loadImage('/assets/frame.png');

  // Set canvas size
  previewCanvas.width = CANVAS_SIZE;
  previewCanvas.height = CANVAS_SIZE;

  // Event listeners
  setupEventListeners();

  console.log('Campaign photo editor initialized!');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Upload zone click
  uploadZone.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', handleFileSelect);

  // Drag and drop
  uploadZone.addEventListener('dragover', handleDragOver);
  uploadZone.addEventListener('dragleave', handleDragLeave);
  uploadZone.addEventListener('drop', handleDrop);

  // Canvas dragging
  previewCanvas.addEventListener('mousedown', handleMouseDown);
  previewCanvas.addEventListener('mousemove', handleMouseMove);
  previewCanvas.addEventListener('mouseup', handleMouseUp);
  previewCanvas.addEventListener('mouseleave', handleMouseUp);

  // Touch events for mobile
  previewCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  previewCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  previewCanvas.addEventListener('touchend', handleTouchEnd);

  // Controls
  zoomSlider.addEventListener('input', handleZoom);
  resetBtn.addEventListener('click', handleReset);
  downloadBtn.addEventListener('click', handleDownload);
  changePhotoBtn.addEventListener('click', handleChangePhoto);
}

// ===== File Handling =====
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  } else if (file) {
    alert('Please upload a valid image file (JPG, PNG, WebP).');
  }
}

function handleDragOver(e) {
  e.preventDefault();
  uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  uploadZone.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  }
}

function processFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      state.image = await loadImage(e.target.result);
      showPreview();
      render();
    } catch (error) {
      console.error('Error loading image:', error);
    }
  };
  reader.readAsDataURL(file);
}

// ===== Preview =====
function showPreview() {
  uploadZone.classList.add('hidden');
  previewContainer.classList.remove('hidden');

  // Calculate initial scale to fit the image nicely in the ellipse
  const imgRatio = state.image.width / state.image.height;
  const minDimension = Math.min(state.image.width, state.image.height);

  // Scale so the image fills the ellipse area
  state.scale = (ELLIPSE_RADIUS_Y * 2) / minDimension;
  if (state.scale < 0.5) state.scale = 0.5;
  if (state.scale > 2) state.scale = 2;

  // Update slider to match calculated scale
  const sliderValue = Math.round(state.scale * 100);
  zoomSlider.value = Math.min(200, Math.max(50, sliderValue));
  zoomValue.textContent = `${zoomSlider.value}%`;

  // Reset position
  state.offsetX = 0;
  state.offsetY = 0;
}

function hidePreview() {
  uploadZone.classList.remove('hidden');
  previewContainer.classList.add('hidden');
  state.image = null;
  fileInput.value = '';
}

// ===== Rendering =====
function render() {
  if (!state.image) return;

  // Clear canvas with red background
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Calculate image dimensions
  const scaledWidth = state.image.width * state.scale;
  const scaledHeight = state.image.height * state.scale;

  // Center image on canvas with offset
  const x = (CANVAS_SIZE / 2) - (scaledWidth / 2) + state.offsetX;
  const y = (CANVAS_SIZE / 2) - (scaledHeight / 2) + state.offsetY;

  // Draw user image
  ctx.drawImage(state.image, x, y, scaledWidth, scaledHeight);

  // Draw the frame overlay on top (PNG transparency shows photo underneath)
  if (state.frameImage) {
    ctx.drawImage(state.frameImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }
}

// ===== Drag Handling =====
function handleMouseDown(e) {
  state.isDragging = true;
  state.dragStartX = e.clientX;
  state.dragStartY = e.clientY;
  state.lastOffsetX = state.offsetX;
  state.lastOffsetY = state.offsetY;
  previewCanvas.style.cursor = 'grabbing';
}

function handleMouseMove(e) {
  if (!state.isDragging) return;

  const canvasRect = previewCanvas.getBoundingClientRect();
  const scaleRatio = CANVAS_SIZE / canvasRect.width;

  state.offsetX = state.lastOffsetX + (e.clientX - state.dragStartX) * scaleRatio;
  state.offsetY = state.lastOffsetY + (e.clientY - state.dragStartY) * scaleRatio;

  render();
}

function handleMouseUp() {
  state.isDragging = false;
  previewCanvas.style.cursor = 'grab';
}

// ===== Touch Handling =====
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  state.isDragging = true;
  state.dragStartX = touch.clientX;
  state.dragStartY = touch.clientY;
  state.lastOffsetX = state.offsetX;
  state.lastOffsetY = state.offsetY;
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!state.isDragging) return;

  const touch = e.touches[0];
  const canvasRect = previewCanvas.getBoundingClientRect();
  const scaleRatio = CANVAS_SIZE / canvasRect.width;

  state.offsetX = state.lastOffsetX + (touch.clientX - state.dragStartX) * scaleRatio;
  state.offsetY = state.lastOffsetY + (touch.clientY - state.dragStartY) * scaleRatio;

  render();
}

function handleTouchEnd() {
  state.isDragging = false;
}

// ===== Controls =====
function handleZoom(e) {
  state.scale = parseInt(e.target.value) / 100;
  zoomValue.textContent = `${e.target.value}%`;
  render();
}

function handleReset() {
  // Recalculate initial scale
  if (state.image) {
    const minDimension = Math.min(state.image.width, state.image.height);
    state.scale = (ELLIPSE_RADIUS_Y * 2) / minDimension;
    if (state.scale < 0.5) state.scale = 0.5;
    if (state.scale > 2) state.scale = 2;

    const sliderValue = Math.round(state.scale * 100);
    zoomSlider.value = Math.min(200, Math.max(50, sliderValue));
    zoomValue.textContent = `${zoomSlider.value}%`;
  } else {
    state.scale = 1;
    zoomSlider.value = 100;
    zoomValue.textContent = '100%';
  }

  state.offsetX = 0;
  state.offsetY = 0;
  render();
}

function handleChangePhoto() {
  hidePreview();
}

function handleDownload() {
  // Create download link
  const link = document.createElement('a');
  link.download = 'no-boat-no-vote-campaign-photo.png';
  link.href = previewCanvas.toDataURL('image/png', 1.0);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===== Start =====
init();
