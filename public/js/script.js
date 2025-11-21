// Tab navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-panel').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Activate selected button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Upload type navigation
function showUploadType(type) {
    document.querySelectorAll('.upload-type').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`${type}-upload`).classList.add('active');
    event.target.classList.add('active');
}

// Initialize event listeners
function initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showTab(tabName);
        });
    });

    // Upload type navigation
    document.querySelectorAll('.option-btn').forEach(button => {
        button.addEventListener('click', function() {
            const optionType = this.getAttribute('data-option');
            showUploadType(optionType);
        });
    });

    // File input change handlers
    document.getElementById('fileInput').addEventListener('change', function(e) {
        updateSingleFileDisplay(e.target.files[0]);
    });

    document.getElementById('filesInput').addEventListener('change', function(e) {
        updateMultipleFilesDisplay(e.target.files);
    });

    // Browse buttons
    document.querySelectorAll('.browse-btn').forEach(button => {
        button.addEventListener('click', function() {
            const form = this.closest('form');
            const fileInput = form.querySelector('input[type="file"]');
            fileInput.click();
        });
    });

    // Form submissions
    document.getElementById('uploadForm').addEventListener('submit', handleSingleUpload);
    document.getElementById('uploadFolderForm').addEventListener('submit', handleMultipleUpload);
    document.getElementById('findForm').addEventListener('submit', handleFindFiles);
}

// Drag and drop functionality
function initializeDragAndDrop() {
    const singleDropZone = document.getElementById('singleDropZone');
    const multipleDropZone = document.getElementById('multipleDropZone');
    const fileInput = document.getElementById('fileInput');
    const filesInput = document.getElementById('filesInput');

    // Single file drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        singleDropZone.addEventListener(eventName, preventDefaults, false);
        multipleDropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        singleDropZone.addEventListener(eventName, highlight, false);
        multipleDropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        singleDropZone.addEventListener(eventName, unhighlight, false);
        multipleDropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        this.classList.add('dragover');
    }

    function unhighlight() {
        this.classList.remove('dragover');
    }

    singleDropZone.addEventListener('drop', handleSingleDrop, false);
    multipleDropZone.addEventListener('drop', handleMultipleDrop, false);

    function handleSingleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        updateSingleFileDisplay(files[0]);
    }

    function handleMultipleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        filesInput.files = files;
        updateMultipleFilesDisplay(files);
    }
}

function updateSingleFileDisplay(file) {
    const dropZone = document.getElementById('singleDropZone');
    const dropContent = dropZone.querySelector('.drop-content');
    
    if (file) {
        dropContent.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-file"></i>
            </div>
            <h3>${file.name}</h3>
            <p>Size: ${formatFileSize(file.size)}</p>
            <p class="file-info">Ready to upload</p>
            <button type="button" class="browse-btn primary-btn">
                <i class="fas fa-sync"></i>
                Change File
            </button>
        `;
        
        // Re-attach event listener to the new button
        const newButton = dropContent.querySelector('.browse-btn');
        newButton.addEventListener('click', function() {
            document.getElementById('fileInput').click();
        });
    }
}

function updateMultipleFilesDisplay(files) {
    const selectedFilesDiv = document.getElementById('selectedFiles');
    selectedFilesDiv.innerHTML = '';
    
    if (files.length > 0) {
        selectedFilesDiv.innerHTML = '<h4>Selected Files:</h4>';
        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
            `;
            selectedFilesDiv.appendChild(fileItem);
        });
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Form submissions
async function handleSingleUpload(e) {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    
    if (!fileInput.files[0]) {
        showResult('Please select a file to upload', 'error');
        return;
    }

    formData.append('file', fileInput.files[0]);
    formData.append('duration', document.getElementById('duration').value);
    formData.append('customCode', document.getElementById('customCode').value);

    await uploadFiles(formData, '/api/files/upload');
}

async function handleMultipleUpload(e) {
    e.preventDefault();
    const formData = new FormData();
    const filesInput = document.getElementById('filesInput');
    
    if (!filesInput.files.length) {
        showResult('Please select files to upload', 'error');
        return;
    }

    for (let i = 0; i < filesInput.files.length; i++) {
        formData.append('files', filesInput.files[i]);
    }
    
    formData.append('duration', document.getElementById('folderDuration').value);
    formData.append('customCode', document.getElementById('folderCustomCode').value);

    await uploadFiles(formData, '/api/files/upload-folder');
}

async function uploadFiles(formData, endpoint) {
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        submitBtn.disabled = true;

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showResult(`
                <div class="text-center">
                    <h3><i class="fas fa-check-circle"></i> Upload Successful!</h3>
                    <div class="mt-2">
                        <p><strong>Access Code:</strong> <code style="background: var(--border-light); padding: 0.25rem 0.5rem; border-radius: var(--radius-sm);">${result.accessCode}</code></p>
                        <p><strong>Expires:</strong> ${result.expiresAt}</p>
                    </div>
                    <p class="mt-2">Share this code with others to access your files.</p>
                </div>
            `, 'success');
            
            // Reset forms
            document.getElementById('uploadForm').reset();
            document.getElementById('uploadFolderForm').reset();
            resetFileDisplays();
        } else {
            showResult(`<i class="fas fa-exclamation-circle"></i> Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showResult('<i class="fas fa-exclamation-circle"></i> Upload failed. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleFindFiles(e) {
    e.preventDefault();
    const accessCode = document.getElementById('accessCode').value.trim().toUpperCase();
    const findBtn = document.querySelector('#findForm .submit-btn');
    const originalText = findBtn.innerHTML;

    try {
        findBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        findBtn.disabled = true;

        const response = await fetch(`/api/files/find/${accessCode}`);
        const result = await response.json();

        const resultDiv = document.getElementById('findResult');
        
        if (result.success) {
            const file = result.file;
            let filesHtml = '';
            
            if (file.isFolder) {
                filesHtml = `
                    <h4><i class="fas fa-folder"></i> Folder Contents (${file.folderFiles.length} files)</h4>
                    <div class="file-list">
                `;
                file.folderFiles.forEach((f, index) => {
                    filesHtml += `
                        <div class="file-item-download">
                            <div>
                                <strong>${f.originalName}</strong><br>
                                <small>${formatFileSize(f.fileSize)} • ${f.fileType}</small>
                            </div>
                            <a href="/api/files/download/${file._id}/${f.filename}" 
                               class="download-btn" download="${f.originalName}">
                                <i class="fas fa-download"></i>
                                Download
                            </a>
                        </div>
                    `;
                });
                filesHtml += '</div>';
            } else {
                filesHtml = `
                    <div class="file-item-download">
                        <div>
                            <strong>${file.originalName}</strong><br>
                            <small>${formatFileSize(file.fileSize)} • ${file.fileType}</small>
                        </div>
                        <a href="/api/files/download/${file._id}" 
                           class="download-btn" download="${file.originalName}">
                            <i class="fas fa-download"></i>
                            Download
                        </a>
                    </div>
                `;
            }

            resultDiv.innerHTML = `
                <div class="result-success">
                    <div class="text-center">
                        <h3><i class="fas fa-check-circle"></i> Files Found!</h3>
                    </div>
                    ${filesHtml}
                    <div class="expiry-info">
                        <i class="fas fa-clock"></i> Files expire: ${new Date(file.expiresAt).toLocaleString()}
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="result-error">
                    <div class="text-center">
                        <h3><i class="fas fa-exclamation-circle"></i> File Not Found</h3>
                        <p>${result.error}. Please check the access code and try again.</p>
                    </div>
                </div>
            `;
        }
        
        resultDiv.style.display = 'block';
    } catch (error) {
        document.getElementById('findResult').innerHTML = `
            <div class="result-error">
                <div class="text-center">
                    <h3><i class="fas fa-exclamation-circle"></i> Search Failed</h3>
                    <p>An error occurred while searching. Please try again.</p>
                </div>
            </div>
        `;
        document.getElementById('findResult').style.display = 'block';
    } finally {
        findBtn.innerHTML = originalText;
        findBtn.disabled = false;
    }
}

function showResult(message, type) {
    const resultDiv = document.getElementById('uploadResult');
    resultDiv.innerHTML = `
        <div class="result-${type}">
            ${message}
        </div>
    `;
    resultDiv.style.display = 'block';
    
    // Scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

function resetFileDisplays() {
    // Reset single file display
    const singleDropZone = document.getElementById('singleDropZone');
    const singleDropContent = singleDropZone.querySelector('.drop-content');
    singleDropContent.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <h3>Choose a file to upload</h3>
        <p>Drag & drop or click to browse</p>
        <p class="file-info">Max file size: 100MB</p>
        <button type="button" class="browse-btn primary-btn">
            <i class="fas fa-folder-open"></i>
            Browse Files
        </button>
    `;
    
    // Re-attach event listener
    const singleBrowseBtn = singleDropContent.querySelector('.browse-btn');
    singleBrowseBtn.addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });

    // Reset multiple files display
    const multipleDropZone = document.getElementById('multipleDropZone');
    const multipleDropContent = multipleDropZone.querySelector('.drop-content');
    multipleDropContent.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-folder-plus"></i>
        </div>
        <h3>Choose multiple files</h3>
        <p>Drag & drop or click to browse</p>
        <p class="file-info">Max 10 files, 100MB each</p>
        <button type="button" class="browse-btn primary-btn">
            <i class="fas fa-folder-open"></i>
            Browse Files
        </button>
    `;
    
    // Re-attach event listener
    const multipleBrowseBtn = multipleDropContent.querySelector('.browse-btn');
    multipleBrowseBtn.addEventListener('click', function() {
        document.getElementById('filesInput').click();
    });

    // Clear selected files
    document.getElementById('selectedFiles').innerHTML = '';
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeDragAndDrop();
    
    // Set initial states
    showTab('upload');
    showUploadType('single');
});