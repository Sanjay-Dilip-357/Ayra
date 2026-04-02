// ==================== ADMIN DASHBOARD JS ====================

let allDocuments = [];
let allUsers = [];
let currentEditDocId = null;
let currentFilter = 'all';
let searchDebounceTimer = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function () {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadAdminStats();
    loadUsers();
    loadDocuments();
});

function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const el = document.getElementById('currentDateTime');
    if (el) {
        el.textContent = now.toLocaleDateString('en-US', options);
    }
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');
    const toastIcon = document.getElementById('toastIcon');

    toastTitle.textContent = title;
    toastBody.textContent = message;

    toastIcon.className = 'bi me-2';
    switch (type) {
        case 'success':
            toastIcon.classList.add('bi-check-circle-fill', 'text-success');
            break;
        case 'error':
            toastIcon.classList.add('bi-x-circle-fill', 'text-danger');
            break;
        case 'warning':
            toastIcon.classList.add('bi-exclamation-triangle-fill', 'text-warning');
            break;
        default:
            toastIcon.classList.add('bi-info-circle-fill', 'text-info');
    }

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// ==================== LOAD ADMIN STATS ====================

async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();

        if (data.success) {
            const overall = data.overall;

            document.getElementById('totalUsers').textContent = overall.total_users || 0;
            document.getElementById('activeUsers').textContent = overall.active_users || 0;
            document.getElementById('totalDocuments').textContent = overall.total_documents || 0;
            document.getElementById('generatedDocs').textContent = overall.generated || 0;

            document.getElementById('overviewDrafts').textContent = overall.drafts || 0;
            document.getElementById('overviewPending').textContent = overall.pending || 0;
            document.getElementById('overviewApproved').textContent = overall.approved || 0;
            document.getElementById('overviewGenerated').textContent = overall.generated || 0;

            renderUserActivity(data.users || []);
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

function renderUserActivity(users) {
    const tbody = document.getElementById('userActivityBody');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">No user activity found</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>${user.stats?.drafts || 0}</td>
            <td>${user.stats?.pending || 0}</td>
            <td>${user.stats?.approved || 0}</td>
            <td>${user.stats?.generated || 0}</td>
            <td>${user.last_login ? formatDate(user.last_login) : '<span class="text-muted">Never</span>'}</td>
        </tr>
    `).join('');
}

// ==================== LOAD USERS ====================

async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();

        if (data.success) {
            allUsers = data.users || [];
            renderUsers(allUsers);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('usersEmptyState');

    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('d-none');
        return;
    }

    if (emptyState) emptyState.classList.add('d-none');

    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>${user.phone || '-'}</td>
            <td>
                ${user.is_active
            ? '<span class="badge bg-success">Active</span>'
            : '<span class="badge bg-danger">Inactive</span>'}
                ${user.is_approved
            ? '<span class="badge bg-info ms-1">Approved</span>'
            : '<span class="badge bg-warning ms-1">Pending</span>'}
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_login ? formatDate(user.last_login) : '<span class="text-muted">Never</span>'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser('${user.id}')" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                ${!user.is_approved ? `
                    <button class="btn btn-sm btn-success me-1" onclick="approveUser('${user.id}')" title="Approve">
                        <i class="bi bi-check-lg"></i>
                    </button>
                ` : `
                    <button class="btn btn-sm btn-warning me-1" onclick="rejectUser('${user.id}')" title="Revoke">
                        <i class="bi bi-x-lg"></i>
                    </button>
                `}
                <button class="btn btn-sm btn-outline-${user.is_active ? 'warning' : 'success'} me-1" 
                        onclick="toggleUserStatus('${user.id}')" title="${user.is_active ? 'Deactivate' : 'Activate'}">
                    <i class="bi bi-${user.is_active ? 'pause' : 'play'}"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}')" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ==================== USER MANAGEMENT FUNCTIONS ====================

function showAddUserModal() {
    document.getElementById('addUserForm').reset();
    document.getElementById('newUserPassword').value = 'Ayraservices@123';
    const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
    modal.show();
}

function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('newUserPassword').value = password;
}

function resetToDefaultPassword() {
    document.getElementById('newUserPassword').value = 'Ayraservices@123';
}

async function createUser() {
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const phone = document.getElementById('newUserPhone').value.trim();
    const password = document.getElementById('newUserPassword').value;

    if (!name || !email) {
        showToast('Error', 'Name and email are required', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Success', 'User created successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
            loadUsers();
            loadAdminStats();
        } else {
            showToast('Error', data.message || 'Failed to create user', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    }
}

function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPhone').value = user.phone || '';
    document.getElementById('editUserPassword').value = '';

    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
}

async function updateUser() {
    const userId = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const phone = document.getElementById('editUserPhone').value.trim();
    const password = document.getElementById('editUserPassword').value;

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password: password || undefined })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Success', 'User updated successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            loadUsers();
        } else {
            showToast('Error', data.message || 'Failed to update user', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    }
}

async function approveUser(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Success', data.message || 'User approved', 'success');
            loadUsers();
        } else {
            showToast('Error', data.message || 'Failed to approve user', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    }
}

async function rejectUser(userId) {
    if (!confirm('Are you sure you want to revoke approval for this user?')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Success', data.message || 'Approval revoked', 'success');
            loadUsers();
        } else {
            showToast('Error', data.message || 'Failed to revoke approval', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    }
}

async function toggleUserStatus(userId) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Success', data.message, 'success');
            loadUsers();
        } else {
            showToast('Error', data.message || 'Failed to toggle status', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Success', 'User deleted successfully', 'success');
            loadUsers();
            loadAdminStats();
        } else {
            showToast('Error', data.message || 'Failed to delete user', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    }
}

// ==================== LOAD DOCUMENTS ====================

async function loadDocuments() {
    try {
        const response = await fetch('/api/admin/documents');
        const data = await response.json();

        if (data.success) {
            allDocuments = data.documents || [];
            renderDocuments(allDocuments);
        }
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

function renderDocuments(documents) {
    const tbody = document.getElementById('adminDocsTableBody');
    const emptyState = document.getElementById('adminDocsEmptyState');

    if (!tbody) return;

    let filteredDocs = documents;
    if (currentFilter !== 'all') {
        filteredDocs = documents.filter(d => d.status === currentFilter);
    }

    if (filteredDocs.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('d-none');
        return;
    }

    if (emptyState) emptyState.classList.add('d-none');

    tbody.innerHTML = filteredDocs.map(doc => {
        const isPublished = doc.published === true;
        
        return `
        <tr data-doc-id="${doc.id}" data-user-name="${(doc.user_name || '').toLowerCase()}">
            <td>
                <input type="checkbox" class="form-check-input doc-checkbox" 
                       data-doc-id="${doc.id}" onchange="updateSelectedCount()">
            </td>
            <td><strong>${doc.user_name || 'Unknown'}</strong></td>
            <td>${doc.old_name || '-'}</td>
            <td><span class="badge bg-secondary">${doc.template_name || doc.template_type}</span></td>
            <td>${getStatusBadge(doc.status)}</td>
            <td>
                <span class="badge ${isPublished ? 'badge-published' : 'badge-unpublished'}">
                    <i class="bi bi-${isPublished ? 'check-circle' : 'circle'} me-1"></i>
                    ${isPublished ? 'Published' : 'Unpublished'}
                </span>
            </td>
            <td>${formatDate(doc.modified_at)}</td>
            <td class="action-buttons-cell">
                <button class="btn btn-view btn-sm" onclick="viewDocument('${doc.id}')" title="View">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-edit btn-sm" onclick="editDocument('${doc.id}')" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-print btn-sm" onclick="showPrintPreview('${doc.id}')" title="Print Preview">
                    <i class="bi bi-printer"></i>
                </button>
                <button class="btn btn-download-all btn-sm" onclick="downloadAllFiles('${doc.id}')" title="Download All">
                    <i class="bi bi-file-zip"></i>
                </button>
                <button class="btn btn-download-cd btn-sm" onclick="downloadCDOnly('${doc.id}')" title="Download CD">
                    <i class="bi bi-file-earmark-word"></i>
                </button>
                <button class="btn btn-sm ${isPublished ? 'btn-published' : 'btn-publish'}" 
                        onclick="togglePublish('${doc.id}')" 
                        title="${isPublished ? 'Click to Unpublish' : 'Click to Publish'}">
                    <i class="bi bi-${isPublished ? 'eye-slash' : 'eye'}"></i>
                    ${isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button class="btn btn-delete btn-sm" onclick="deleteDocument('${doc.id}')" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `}).join('');

    updateSelectedCount();
}

function getStatusBadge(status) {
    const badges = {
        'draft': '<span class="badge bg-warning text-dark">Draft</span>',
        'pending': '<span class="badge bg-info">Pending</span>',
        'approved': '<span class="badge bg-success">Approved</span>',
        'generated': '<span class="badge bg-primary">Generated</span>'
    };
    return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function filterAdminDocs(filter) {
    currentFilter = filter;

    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    renderDocuments(allDocuments);
}

// ==================== SEARCH DOCUMENTS BY USER ====================

function debounceSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(searchDocumentsByUser, 300);
}

function searchDocumentsByUser() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#adminDocsTableBody tr');
    const searchInfo = document.getElementById('searchResultsInfo');
    const searchText = document.getElementById('searchResultsText');

    let visibleCount = 0;

    rows.forEach(row => {
        const userName = row.getAttribute('data-user-name') || '';
        const matches = userName.includes(searchTerm) || searchTerm === '';

        row.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
    });

    if (searchTerm) {
        searchInfo.classList.remove('d-none');
        searchText.textContent = `Showing ${visibleCount} document(s) for "${searchTerm}"`;
    } else {
        searchInfo.classList.add('d-none');
    }
}

function clearUserSearch() {
    document.getElementById('userSearchInput').value = '';
    document.getElementById('searchResultsInfo').classList.add('d-none');

    const rows = document.querySelectorAll('#adminDocsTableBody tr');
    rows.forEach(row => {
        row.style.display = '';
    });
}

// ==================== DOCUMENT SELECTION ====================

function toggleSelectAllDocs() {
    const selectAll = document.getElementById('selectAllDocs');
    const checkboxes = document.querySelectorAll('.doc-checkbox');

    checkboxes.forEach(cb => {
        if (cb.closest('tr').style.display !== 'none') {
            cb.checked = selectAll.checked;
        }
    });

    updateSelectedCount();
}

function updateSelectedCount() {
    const checked = document.querySelectorAll('.doc-checkbox:checked').length;
    document.getElementById('selectedCount').textContent = checked;
    document.getElementById('bulkDownloadBtn').disabled = checked === 0;
}

async function downloadSelectedDocs() {
    const checked = document.querySelectorAll('.doc-checkbox:checked');
    const docIds = Array.from(checked).map(cb => cb.getAttribute('data-doc-id'));

    if (docIds.length === 0) {
        showToast('Warning', 'No documents selected', 'warning');
        return;
    }

    try {
        showToast('Info', 'Preparing download...', 'info');

        const response = await fetch('/api/admin/documents/download-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doc_ids: docIds })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bulk_documents_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            showToast('Success', 'Download started', 'success');
        } else {
            const data = await response.json();
            showToast('Error', data.message || 'Download failed', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error during download', 'error');
    }
}

// ==================== VIEW DOCUMENT (CD PREVIEW AT TOP) ====================

async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;

    const replacements = doc.replacements || {};
    const modalBody = document.getElementById('viewDocBody');
    const isPublished = doc.published === true;

    // START WITH CD PREVIEW AT TOP
    let html = `
        <div class="view-doc-badge-container">
            ${getStatusBadge(doc.status)}
            <span class="badge ${isPublished ? 'badge-published' : 'badge-unpublished'}">
                <i class="bi bi-${isPublished ? 'check-circle' : 'circle'} me-1"></i>
                ${isPublished ? 'Published' : 'Unpublished'}
            </span>
            <span class="badge bg-secondary">${doc.template_name || doc.template_type}</span>
            <span class="badge bg-dark">User: ${doc.user_name || 'Unknown'}</span>
        </div>
        
        <!-- CD PREVIEW AT TOP -->
        <div class="cd-document-section">
            <div class="cd-document-header">
                <div class="cd-document-icon">
                    <i class="bi bi-file-earmark-text"></i>
                </div>
                <h6 class="cd-document-title">CD Document Preview</h6>
            </div>
            <div class="cd-copy-btn-container">
                <button class="cd-copy-btn" onclick="copyCdContent('viewCdContent')">
                    <i class="bi bi-clipboard"></i> Copy Content
                </button>
            </div>
            <div id="viewCdContent" class="cd-document-content">
                <div class="cd-loading">
                    <i class="bi bi-arrow-repeat"></i>
                    <p>Loading CD preview...</p>
                </div>
            </div>
        </div>
        
        <hr class="my-4">
        <h6 class="text-muted mb-3"><i class="bi bi-list-ul me-2"></i>Document Details</h6>
    `;

    // Personal Section
    html += buildViewSection('Personal Details', 'person-fill', 'personal', [
        { label: 'Old Name', value: replacements.OLD_NAME },
        { label: 'New Name', value: replacements.NEW_NAME },
        { label: 'Relation', value: replacements.UPDATE_RELATION },
        { label: 'Father/Spouse Name', value: replacements['FATHER-SPOUSE_NAME'] },
        { label: 'Wife Of', value: replacements.WIFE_OF ? 'Yes' : '' },
        { label: 'Spouse Name', value: replacements.SPOUSE_NAME1 },
        { label: 'Gender', value: replacements.GENDER_UPDATE },
        { label: 'Cast', value: replacements.CAST_UPDATE }
    ]);

    // Contact Section
    html += buildViewSection('Contact Details', 'telephone-fill', 'contact', [
        { label: 'Phone', value: replacements.PHONE_UPDATE },
        { label: 'Email', value: replacements.EMAIL_UPDATE },
        { label: 'Address', value: replacements.UPDATE_ADDRESS }
    ]);

    // Date Section
    html += buildViewSection('Date Details', 'calendar-event', 'dates', [
        { label: 'Numeric Date', value: replacements.NUM_DATE },
        { label: 'Alphabetic Date', value: replacements.ALPHA_DATE }
    ]);

    // Witness 1 Section
    html += buildViewSection('Witness 1 Details', 'person-badge', 'witness', [
        { label: 'Name', value: replacements.WITNESS_NAME1 },
        { label: 'Phone', value: replacements.WITNESS_PHONE1 },
        { label: 'Address', value: replacements.WITNESS_ADDRESS1 }
    ]);

    // Witness 2 Section
    html += buildViewSection('Witness 2 Details', 'person-badge-fill', 'witness', [
        { label: 'Name', value: replacements.WITNESS_NAME2 },
        { label: 'Phone', value: replacements.WITNESS_PHONE2 },
        { label: 'Address', value: replacements.WITNESS_ADDRESS2 }
    ]);

    // Minor template fields
    if (doc.template_type === 'minor_template') {
        html += buildViewSection('Child Details', 'emoji-smile', 'child', [
            { label: 'Father/Mother Name', value: replacements['FATHER-MOTHER_NAME'] },
            { label: 'Son/Daughter', value: replacements['SON-DAUGHTER'] },
            { label: 'Age', value: replacements.UPDATE_AGE },
            { label: 'Date of Birth', value: replacements.CHILD_DOB },
            { label: 'Birth Place', value: replacements.BIRTH_PLACE }
        ]);
    }

    modalBody.innerHTML = html;

    const modal = new bootstrap.Modal(document.getElementById('viewDocModal'));
    modal.show();

    // Load CD preview
    loadCDPreview(docId, 'viewCdContent');
}

function buildViewSection(title, icon, sectionClass, fields) {
    const filledFields = fields.filter(f => f.value && f.value.toString().trim());
    if (filledFields.length === 0) return '';

    return `
        <div class="view-doc-section ${sectionClass}">
            <div class="view-doc-section-header">
                <div class="view-doc-section-icon">
                    <i class="bi bi-${icon}"></i>
                </div>
                <h6 class="view-doc-section-title">${title}</h6>
            </div>
            <div class="row">
                ${filledFields.map(f => `
                    <div class="col-md-6">
                        <div class="view-doc-field">
                            <span class="view-doc-label">${f.label}</span>
                            <span class="view-doc-value">${f.value}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function loadCDPreview(docId, containerId) {
    try {
        const response = await fetch(`/api/admin/documents/${docId}/cd-preview`);
        const data = await response.json();

        const container = document.getElementById(containerId);
        if (data.success) {
            container.innerHTML = data.cd_content;
        } else {
            container.innerHTML = `<div class="text-center text-muted py-3">${data.message || 'Could not load preview'}</div>`;
        }
    } catch (error) {
        document.getElementById(containerId).innerHTML = `<div class="text-center text-danger py-3">Error loading preview</div>`;
    }
}

function copyCdContent(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const text = container.innerText || container.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = container.parentElement.querySelector('.cd-copy-btn');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        }
        showToast('Success', 'Content copied to clipboard', 'success');
    }).catch(() => {
        showToast('Error', 'Failed to copy content', 'error');
    });
}

// ==================== EDIT DOCUMENT (CD PREVIEW AT TOP - NO AUTO CLOSE) ====================

function editDocument(docId) {
    currentEditDocId = docId;
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;

    document.getElementById('editDocTemplateBadge').textContent = doc.template_name || doc.template_type;

    const modalBody = document.getElementById('editDocBody');
    modalBody.innerHTML = buildEditForm(doc);

    const modal = new bootstrap.Modal(document.getElementById('editDocModal'));
    modal.show();

    // Load CD preview after modal is shown
    setTimeout(() => {
        loadCDPreview(docId, 'editCdContent');
    }, 300);
}

function buildEditForm(doc) {
    const r = doc.replacements || {};
    const previewData = doc.preview_data || {};
    const folderType = previewData.folder_type || 'main';
    const relation = r.UPDATE_RELATION || '';
    const hasSpouse = r.WIFE_OF && r.SPOUSE_NAME1;

    let html = `<input type="hidden" id="editDocId" value="${doc.id}">`;

    // CD DOCUMENT PREVIEW AT TOP
    html += `
        <div class="cd-document-section mb-4">
            <div class="cd-document-header">
                <div class="cd-document-icon">
                    <i class="bi bi-file-earmark-text"></i>
                </div>
                <div>
                    <h6 class="cd-document-title mb-0">CD Document Preview (Live)</h6>
                    <small class="text-muted" style="color: #92400e !important;">Updates when you save changes</small>
                </div>
            </div>
            <div class="cd-copy-btn-container">
                <button type="button" class="cd-copy-btn" onclick="copyCdContent('editCdContent')">
                    <i class="bi bi-clipboard"></i> Copy Content
                </button>
                <button type="button" class="btn btn-outline-warning btn-sm ms-2" onclick="refreshCdPreviewFromForm()">
                    <i class="bi bi-arrow-clockwise"></i> Preview Changes
                </button>
            </div>
            <div id="editCdContent" class="cd-document-content">
                <div class="cd-loading">
                    <i class="bi bi-arrow-repeat"></i>
                    <p>Loading CD preview...</p>
                </div>
            </div>
        </div>
        
        <hr class="my-4">
        <h6 class="text-primary mb-3"><i class="bi bi-pencil-square me-2"></i>Edit Document Details</h6>
    `;

    // Personal Details
    html += `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon"><i class="bi bi-person-fill"></i></div>
                <h6 class="section-title">Personal Details</h6>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Old Name <span class="required-asterisk">*</span></label>
                    <input type="text" class="form-control uppercase-input" id="editOldName" 
                           value="${r.OLD_NAME || ''}" style="text-transform: uppercase;">
                </div>
                <div class="col-md-6">
                    <label class="form-label">New Name</label>
                    <input type="text" class="form-control uppercase-input" id="editNewName" 
                           value="${r.NEW_NAME || ''}" style="text-transform: uppercase;">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Relation</label>
                    <select class="form-select" id="editRelation" onchange="handleRelationChange()">
                        <option value="">Select...</option>
                        <option value="S/o" ${relation === 'S/o' ? 'selected' : ''}>S/o (Son of)</option>
                        <option value="D/o" ${relation === 'D/o' ? 'selected' : ''}>D/o (Daughter of)</option>
                        <option value="W/o" ${relation === 'W/o' ? 'selected' : ''}>W/o (Wife of)</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Father/Spouse Name</label>
                    <input type="text" class="form-control uppercase-input" id="editFatherSpouse" 
                           value="${r['FATHER-SPOUSE_NAME'] || ''}" style="text-transform: uppercase;">
                </div>
                
                <!-- D/o & W/o Fields -->
                <div class="col-12" id="dualRelationContainer" style="display: ${hasSpouse || relation === 'D/o' ? 'block' : 'none'};">
                    <div class="dual-relation-card">
                        <div class="card-header">
                            <i class="bi bi-heart-fill me-2"></i>D/o & W/o - Additional Spouse Details
                        </div>
                        <div class="card-body p-3">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Spouse Name</label>
                                    <input type="text" class="form-control uppercase-input" id="editSpouseName1" 
                                           value="${r.SPOUSE_NAME1 || ''}" style="text-transform: uppercase;">
                                </div>
                                <div class="col-md-6">
                                    <div class="form-check mt-4">
                                        <input class="form-check-input" type="checkbox" id="editHasSpouse" 
                                               ${hasSpouse ? 'checked' : ''} onchange="toggleSpouseFields()">
                                        <label class="form-check-label" for="editHasSpouse">
                                            Include W/o (Wife of) in document
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <label class="form-label">Gender</label>
                    <select class="form-select" id="editGender">
                        <option value="">Select...</option>
                        <option value="MALE" ${(r.GENDER_UPDATE || '').toUpperCase() === 'MALE' ? 'selected' : ''}>Male</option>
                        <option value="FEMALE" ${(r.GENDER_UPDATE || '').toUpperCase() === 'FEMALE' ? 'selected' : ''}>Female</option>
                        <option value="OTHER" ${(r.GENDER_UPDATE || '').toUpperCase() === 'OTHER' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Cast</label>
                    <input type="text" class="form-control uppercase-input" id="editCast" 
                           value="${r.CAST_UPDATE || ''}" style="text-transform: uppercase;">
                </div>
            </div>
        </div>
    `;

    // Minor template additional fields
    if (doc.template_type === 'minor_template') {
        html += `
            <div class="form-section">
                <div class="section-header">
                    <div class="section-icon"><i class="bi bi-emoji-smile"></i></div>
                    <h6 class="section-title">Child Details</h6>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Father/Mother Name</label>
                        <input type="text" class="form-control uppercase-input" id="editFatherMother" 
                               value="${r['FATHER-MOTHER_NAME'] || ''}" style="text-transform: uppercase;">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Son/Daughter</label>
                        <select class="form-select" id="editSonDaughter">
                            <option value="">Select...</option>
                            <option value="Son" ${r['SON-DAUGHTER'] === 'Son' ? 'selected' : ''}>Son</option>
                            <option value="Daughter" ${r['SON-DAUGHTER'] === 'Daughter' ? 'selected' : ''}>Daughter</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Age</label>
                        <input type="number" class="form-control" id="editAge" value="${r.UPDATE_AGE || ''}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Date of Birth</label>
                        <input type="text" class="form-control" id="editChildDob" value="${r.CHILD_DOB || ''}" placeholder="DD/MM/YYYY">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Birth Place</label>
                        <input type="text" class="form-control uppercase-input" id="editBirthPlace" 
                               value="${r.BIRTH_PLACE || ''}" style="text-transform: uppercase;">
                    </div>
                </div>
            </div>
        `;
    }

    // Contact Details
    html += `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon"><i class="bi bi-telephone-fill"></i></div>
                <h6 class="section-title">Contact Details</h6>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Phone Number</label>
                    <input type="tel" class="form-control" id="editPhone" value="${r.PHONE_UPDATE || ''}" maxlength="10">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" id="editEmail" value="${r.EMAIL_UPDATE || ''}">
                </div>
                <div class="col-12">
                    <label class="form-label">Address</label>
                    <textarea class="form-control uppercase-input" id="editAddress" rows="2" 
                              style="text-transform: uppercase;">${r.UPDATE_ADDRESS || ''}</textarea>
                </div>
            </div>
        </div>
    `;

    // Date Details
    html += `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon"><i class="bi bi-calendar-event"></i></div>
                <h6 class="section-title">Date Details</h6>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Numeric Date</label>
                    <input type="text" class="form-control" id="editNumDate" value="${r.NUM_DATE || ''}" placeholder="DD/MM/YYYY">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Alphabetic Date</label>
                    <input type="text" class="form-control" id="editAlphaDate" value="${r.ALPHA_DATE || ''}" placeholder="1ST JANUARY 2025">
                </div>
            </div>
        </div>
    `;

    // Witness 1 Details
    html += `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon"><i class="bi bi-person-badge"></i></div>
                <h6 class="section-title">Witness 1 Details</h6>
            </div>
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Name</label>
                    <input type="text" class="form-control uppercase-input" id="editWitness1Name" 
                           value="${r.WITNESS_NAME1 || ''}" style="text-transform: uppercase;">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" id="editWitness1Phone" value="${r.WITNESS_PHONE1 || ''}" maxlength="10">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Address</label>
                    <input type="text" class="form-control uppercase-input" id="editWitness1Address" 
                           value="${r.WITNESS_ADDRESS1 || ''}" style="text-transform: uppercase;">
                </div>
            </div>
        </div>
    `;

    // Witness 2 Details
    html += `
        <div class="form-section">
            <div class="section-header">
                <div class="section-icon"><i class="bi bi-person-badge-fill"></i></div>
                <h6 class="section-title">Witness 2 Details</h6>
            </div>
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Name</label>
                    <input type="text" class="form-control uppercase-input" id="editWitness2Name" 
                           value="${r.WITNESS_NAME2 || ''}" style="text-transform: uppercase;">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" id="editWitness2Phone" value="${r.WITNESS_PHONE2 || ''}" maxlength="10">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Address</label>
                    <input type="text" class="form-control uppercase-input" id="editWitness2Address" 
                           value="${r.WITNESS_ADDRESS2 || ''}" style="text-transform: uppercase;">
                </div>
            </div>
        </div>
    `;

    // Folder Type
    if (doc.template_type === 'major_template' || doc.template_type === 'religion_template') {
        html += `
            <div class="form-section">
                <div class="section-header">
                    <div class="section-icon"><i class="bi bi-folder"></i></div>
                    <h6 class="section-title">Template Folder</h6>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Folder Type</label>
                        <select class="form-select" id="editFolderType">
                            <option value="main" ${folderType === 'main' ? 'selected' : ''}>Main Template (Married)</option>
                            <option value="unmarried" ${folderType === 'unmarried' ? 'selected' : ''}>Unmarried Template</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    return html;
}

function handleRelationChange() {
    const relation = document.getElementById('editRelation').value;
    const container = document.getElementById('dualRelationContainer');

    if (relation === 'D/o' && container) {
        container.style.display = 'block';
    } else if (container) {
        container.style.display = 'none';
        // Clear spouse fields when hiding
        const spouseInput = document.getElementById('editSpouseName1');
        const hasSpouseCheck = document.getElementById('editHasSpouse');
        if (spouseInput) spouseInput.value = '';
        if (hasSpouseCheck) hasSpouseCheck.checked = false;
    }
}

function toggleSpouseFields() {
    const hasSpouse = document.getElementById('editHasSpouse').checked;
    const spouseInput = document.getElementById('editSpouseName1');
    
    if (!hasSpouse && spouseInput) {
        spouseInput.value = '';
    }
}

function refreshCdPreviewFromForm() {
    // This just reloads the current saved preview
    // For a true "live preview from form" we'd need a server endpoint that accepts form data
    if (currentEditDocId) {
        loadCDPreview(currentEditDocId, 'editCdContent');
        showToast('Info', 'Preview refreshed. Save changes first to see updates.', 'info');
    }
}

// ==================== SAVE DOCUMENT (NO AUTO CLOSE - REFRESH PREVIEW) ====================

async function saveDocumentChanges() {
    const docId = document.getElementById('editDocId').value;
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;

    // Show loading state
    const saveBtn = document.querySelector('#editDocModal .modal-footer .btn-primary');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    saveBtn.disabled = true;

    const replacements = {
        OLD_NAME: document.getElementById('editOldName')?.value.toUpperCase().trim() || '',
        NEW_NAME: document.getElementById('editNewName')?.value.toUpperCase().trim() || '',
        UPDATE_RELATION: document.getElementById('editRelation')?.value || '',
        'FATHER-SPOUSE_NAME': document.getElementById('editFatherSpouse')?.value.toUpperCase().trim() || '',
        GENDER_UPDATE: document.getElementById('editGender')?.value || '',
        CAST_UPDATE: document.getElementById('editCast')?.value.toUpperCase().trim() || '',
        PHONE_UPDATE: document.getElementById('editPhone')?.value.trim() || '',
        EMAIL_UPDATE: document.getElementById('editEmail')?.value.trim() || '',
        UPDATE_ADDRESS: document.getElementById('editAddress')?.value.toUpperCase().trim() || '',
        NUM_DATE: document.getElementById('editNumDate')?.value.trim() || '',
        ALPHA_DATE: document.getElementById('editAlphaDate')?.value.trim() || '',
        WITNESS_NAME1: document.getElementById('editWitness1Name')?.value.toUpperCase().trim() || '',
        WITNESS_PHONE1: document.getElementById('editWitness1Phone')?.value.trim() || '',
        WITNESS_ADDRESS1: document.getElementById('editWitness1Address')?.value.toUpperCase().trim() || '',
        WITNESS_NAME2: document.getElementById('editWitness2Name')?.value.toUpperCase().trim() || '',
        WITNESS_PHONE2: document.getElementById('editWitness2Phone')?.value.trim() || '',
        WITNESS_ADDRESS2: document.getElementById('editWitness2Address')?.value.toUpperCase().trim() || ''
    };

    // Handle spouse fields
    const hasSpouseCheck = document.getElementById('editHasSpouse');
    const spouseName1El = document.getElementById('editSpouseName1');
    
    if (hasSpouseCheck && hasSpouseCheck.checked && spouseName1El && spouseName1El.value.trim()) {
        replacements.WIFE_OF = ' W/o ';
        replacements.SPOUSE_NAME1 = spouseName1El.value.toUpperCase().trim();
    } else {
        replacements.WIFE_OF = '';
        replacements.SPOUSE_NAME1 = '';
    }

    // Minor template fields
    if (doc.template_type === 'minor_template') {
        replacements['FATHER-MOTHER_NAME'] = document.getElementById('editFatherMother')?.value.toUpperCase().trim() || '';
        replacements['SON-DAUGHTER'] = document.getElementById('editSonDaughter')?.value || '';
        replacements.UPDATE_AGE = document.getElementById('editAge')?.value || '';
        replacements.CHILD_DOB = document.getElementById('editChildDob')?.value || '';
        replacements.BIRTH_PLACE = document.getElementById('editBirthPlace')?.value.toUpperCase().trim() || '';

        const sonDaughter = replacements['SON-DAUGHTER'];
        replacements.HE_SHE = sonDaughter === 'Son' ? 'he' : sonDaughter === 'Daughter' ? 'she' : 'he/she';
    } else {
        const gender = replacements.GENDER_UPDATE;
        replacements.HE_SHE = gender === 'MALE' ? 'he' : gender === 'FEMALE' ? 'she' : 'he/she';
    }

    const folderTypeEl = document.getElementById('editFolderType');
    const folderType = folderTypeEl ? folderTypeEl.value : 'main';

    try {
        const response = await fetch(`/api/admin/documents/${docId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replacements, folder_type: folderType })
        });

        const data = await response.json();

        // Reset button state
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;

        if (data.success) {
            showToast('Success', 'Document saved! Preview updated.', 'success');
            
            // Update local data
            const docIndex = allDocuments.findIndex(d => d.id === docId);
            if (docIndex !== -1) {
                allDocuments[docIndex].replacements = replacements;
                allDocuments[docIndex].old_name = replacements.OLD_NAME;
            }
            
            // Refresh CD preview WITHOUT closing modal
            loadCDPreview(docId, 'editCdContent');
            
            // Update the documents table in background
            loadDocuments();
            loadAdminStats();
            
            // DO NOT CLOSE MODAL - User must click X to close
        } else {
            showToast('Error', data.message || 'Failed to save', 'error');
        }
    } catch (error) {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
        showToast('Error', 'Network error', 'error');
    }
}

// ==================== PRINT PREVIEW ====================

async function showPrintPreview(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;

    const modalBody = document.getElementById('printPreviewBody');
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading print preview...</p>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('printPreviewModal'));
    modal.show();

    try {
        const response = await fetch(`/api/admin/documents/${docId}/print-preview`);
        const data = await response.json();

        if (data.success && data.documents) {
            let html = `
                <div class="print-preview-container">
                    <div class="alert alert-info mb-4 no-print">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="bi bi-info-circle me-2"></i>
                                <strong>${data.documents.length} documents</strong> ready for printing. 
                                <span class="text-danger fw-bold">Witness document will print twice.</span>
                            </div>
                            <div>
                                <span class="badge bg-primary">${data.document_name}</span>
                            </div>
                        </div>
                    </div>
            `;

            data.documents.forEach((doc, index) => {
                const printCopies = doc.print_count || 1;
                const isWitness = doc.filename.toUpperCase().includes('WITNESS');
                const headerColor = isWitness ? '#ed8936' : '#667eea';
                
                for (let copy = 1; copy <= printCopies; copy++) {
                    const copyLabel = printCopies > 1 ? ` (Copy ${copy} of ${printCopies})` : '';
                    
                    html += `
                        <div class="print-document-wrapper" style="page-break-after: always;">
                            <div class="print-document-header" style="background: linear-gradient(135deg, ${headerColor} 0%, ${isWitness ? '#dd6b20' : '#764ba2'} 100%);">
                                <span class="doc-name">
                                    <i class="bi bi-file-earmark-text me-2"></i>
                                    ${doc.filename}${copyLabel}
                                </span>
                                ${isWitness ? '<span class="print-count-badge"><i class="bi bi-files me-1"></i>2 Copies Required</span>' : ''}
                            </div>
                            <div class="print-document-body">
                                ${doc.content}
                            </div>
                        </div>
                    `;
                }
            });

            html += `</div>`;
            modalBody.innerHTML = html;
        } else {
            modalBody.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-circle text-warning" style="font-size: 3rem;"></i>
                    <p class="mt-3">${data.message || 'Could not load print preview'}</p>
                </div>
            `;
        }
    } catch (error) {
        modalBody.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-x-circle text-danger" style="font-size: 3rem;"></i>
                <p class="mt-3">Error loading print preview</p>
            </div>
        `;
    }
}

function printDocuments() {
    window.print();
}

// ==================== DOWNLOAD ALL FILES ====================

async function downloadAllFiles(docId) {
    try {
        showToast('Info', 'Preparing download...', 'info');

        const response = await fetch(`/api/admin/documents/${docId}/download-all`);

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const disposition = response.headers.get('Content-Disposition');
            let filename = 'documents.zip';
            if (disposition && disposition.includes('filename=')) {
                filename = disposition.split('filename=')[1].replace(/"/g, '');
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            showToast('Success', 'Download started', 'success');
        } else {
            const data = await response.json();
            showToast('Error', data.message || 'Download failed', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error during download', 'error');
    }
}

// ==================== DOWNLOAD CD ONLY ====================

async function downloadCDOnly(docId) {
    try {
        showToast('Info', 'Preparing CD download...', 'info');

        const response = await fetch(`/api/admin/documents/${docId}/download-cd`);

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const disposition = response.headers.get('Content-Disposition');
            let filename = 'CD.docx';
            if (disposition && disposition.includes('filename=')) {
                filename = disposition.split('filename=')[1].replace(/"/g, '');
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            showToast('Success', 'CD document downloaded', 'success');
        } else {
            const data = await response.json();
            showToast('Error', data.message || 'Download failed', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error during download', 'error');
    }
}

// ==================== TOGGLE PUBLISH ====================

async function togglePublish(docId) {
    try {
        const response = await fetch(`/api/admin/documents/${docId}/toggle-publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            // Update local data immediately
            const docIndex = allDocuments.findIndex(d => d.id === docId);
            if (docIndex !== -1) {
                allDocuments[docIndex].published = data.published;
                allDocuments[docIndex].published_at = data.published_at;
            }
            
            // Re-render documents
            renderDocuments(allDocuments);
            
            showToast('Success', data.message, 'success');
        } else {
            showToast('Error', data.message || 'Failed to toggle publish status', 'error');
        }
    } catch (error) {
        console.error('Toggle publish error:', error);
        showToast('Error', 'Network error', 'error');
    }
}

// ==================== DELETE DOCUMENT ====================

async function deleteDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    const docName = doc ? doc.old_name : 'this document';

    if (!confirm(`Are you sure you want to delete "${docName}"? This cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/documents/${docId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Success', data.message || 'Document deleted', 'success');
            loadDocuments();
            loadAdminStats();
        } else {
            showToast('Error', data.message || 'Failed to delete', 'error');
        }
    } catch (error) {
        showToast('Error', 'Network error', 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => {
            window.location.href = '/';
        })
        .catch(() => {
            window.location.href = '/';
        });
}