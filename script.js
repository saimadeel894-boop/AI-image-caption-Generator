const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const imageUrlInput = document.getElementById('imageUrl');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const previewImage = document.getElementById('previewImage');
const placeholder = document.querySelector('.preview-frame .placeholder');
const captionBtn = document.getElementById('captionBtn');
const statusEl = document.getElementById('status');
const captionText = document.getElementById('captionText');
const confidenceBar = document.getElementById('confidenceBar');
const confidenceValue = document.getElementById('confidenceValue');
const historyList = document.getElementById('historyList');
const demoButtons = document.querySelectorAll('.demo-row button');

const demoImages = {
  scenic:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  pet: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80'
};

let activeImageSrc = '';
let modelInstance = null;

const ensureModel = async () => {
  if (modelInstance) return modelInstance;
  if (!window.mobilenet) {
    throw new Error('MobileNet library failed to load.');
  }
  setStatus('Loading MobileNet model… this can take a few seconds.', 'info');
  modelInstance = await window.mobilenet.load();
  setStatus('Model loaded. Ready when you are!', 'success');
  return modelInstance;
};

const setPreview = (src) => {
  activeImageSrc = src;
  previewImage.src = src;
  previewImage.style.display = 'block';
  placeholder.style.display = 'none';
  captionBtn.disabled = false;
};

const resetPreview = () => {
  previewImage.src = '';
  previewImage.style.display = 'none';
  placeholder.style.display = 'block';
  captionBtn.disabled = true;
  captionText.textContent = 'Waiting for your image…';
  confidenceBar.style.width = '0%';
  confidenceValue.textContent = '0%';
};

const setStatus = (message, variant = 'info') => {
  statusEl.textContent = message;
  statusEl.dataset.variant = variant;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const handleFile = async (file) => {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('Please choose an image file.', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setStatus('Image too large. Please stay under 5 MB.', 'error');
    return;
  }
  setStatus(`Loaded ${file.name}.`, 'success');
  const dataUrl = await readFileAsDataUrl(file);
  setPreview(dataUrl);
};

const handleUrlLoad = async () => {
  const url = imageUrlInput.value.trim();
  if (!url) {
    setStatus('Enter a valid image URL first.', 'error');
    return;
  }
  setPreview(url);
  setStatus('Loaded image from URL.', 'success');
};

const buildCaption = (predictions) => {
  const [primary, secondary] = predictions;
  const primaryLabel = primary.className.split(',')[0];
  if (!secondary) {
    return `Looks like ${addArticle(primaryLabel)}.`;
  }
  const secondaryLabel = secondary.className.split(',')[0];
  return `Looks like ${addArticle(primaryLabel)} with hints of ${secondaryLabel}.`;
};

const addArticle = (phrase) => {
  const trimmed = phrase.trim();
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const article = vowels.includes(trimmed[0]?.toLowerCase()) ? 'an' : 'a';
  return `${article} ${trimmed}`;
};

const updateConfidence = (probability = 0) => {
  const percent = Math.round(probability * 100);
  confidenceBar.style.width = `${percent}%`;
  confidenceValue.textContent = `${percent}%`;
};

const addToHistory = (caption, predictions) => {
  const li = document.createElement('li');
  const label = predictions
    .map((p) => `${p.className.split(',')[0]} (${Math.round(p.probability * 100)}%)`)
    .join(' • ');
  li.innerHTML = `<strong>${caption}</strong><br/><small>${label}</small>`;
  historyList.prepend(li);
};

const generateCaption = async () => {
  if (!activeImageSrc) {
    setStatus('Select an image first.', 'error');
    return;
  }
  captionBtn.disabled = true;
  setStatus('Analyzing image…', 'info');
  try {
    const model = await ensureModel();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const predictions = await model.classify(previewImage);
    if (!predictions.length) {
      throw new Error('Model returned no predictions.');
    }
    const caption = buildCaption(predictions);
    captionText.textContent = caption;
    updateConfidence(predictions[0].probability);
    addToHistory(caption, predictions.slice(0, 3));
    setStatus('Caption ready!', 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Something went wrong.', 'error');
  } finally {
    captionBtn.disabled = false;
  }
};

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('dragover');
  const [file] = event.dataTransfer.files;
  handleFile(file);
});

fileInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  handleFile(file);
});

loadUrlBtn.addEventListener('click', handleUrlLoad);

demoButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.demo;
    const src = demoImages[key];
    if (!src) return;
    imageUrlInput.value = src;
    setPreview(src);
    setStatus(`Loaded ${key} demo image.`, 'success');
  });
});

captionBtn.addEventListener('click', generateCaption);

resetPreview();

