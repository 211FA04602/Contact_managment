// Global variables
let contacts = [];
let editingContactId = null;

// DOM elements
const contactForm = document.getElementById('contact-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const searchInput = document.getElementById('search-input');
const contactsContainer = document.getElementById('contacts-container');
const contactCount = document.getElementById('contact-count');
const loading = document.getElementById('loading');
const message = document.getElementById('message');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    loadContacts();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    contactForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', cancelEdit);
    searchInput.addEventListener('input', handleSearch);
    
    // Add input validation
    const inputs = contactForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearValidation);
    });
}

// API functions
async function apiRequest(url, method = 'GET', data = null) {
    showLoading();
    
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Something went wrong');
        }
        
        return result;
    } catch (error) {
        showMessage(error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

// Load all contacts
async function loadContacts() {
    try {
        contacts = await apiRequest('/api/contacts');
        renderContacts(contacts);
        updateContactCount(contacts.length);
    } catch (error) {
        console.error('Error loading contacts:', error);
        renderEmptyState();
    }
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const contactData = {
        firstName: formData.get('firstName').trim(),
        lastName: formData.get('lastName').trim(),
        address: formData.get('address').trim(),
        email: formData.get('email').trim(),
        phone: formData.get('phone').trim()
    };
    
    // Validate form
    if (!validateForm(contactData)) {
        return;
    }
    
    try {
        if (editingContactId) {
            // Update existing contact
            await apiRequest(`/api/contacts/${editingContactId}`, 'PUT', contactData);
            showMessage('Contact updated successfully!', 'success');
            cancelEdit();
        } else {
            // Create new contact
            await apiRequest('/api/contacts', 'POST', contactData);
            showMessage('Contact created successfully!', 'success');
            contactForm.reset();
        }
        
        loadContacts();
    } catch (error) {
        console.error('Error saving contact:', error);
    }
}

// Form validation
function validateForm(data) {
    let isValid = true;
    
    // Required fields validation
    Object.keys(data).forEach(key => {
        if (!data[key]) {
            showFieldError(key, 'This field is required');
            isValid = false;
        }
    });
    
    // Email validation
    if (data.email && !isValidEmail(data.email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Phone validation
    if (data.phone && !isValidPhone(data.phone)) {
        showFieldError('phone', 'Please enter a valid phone number');
        isValid = false;
    }
    
    return isValid;
}

// Field validation
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    clearValidation(e);
    
    if (!value) {
        showFieldError(field.name, 'This field is required');
        return false;
    }
    
    if (field.name === 'email' && !isValidEmail(value)) {
        showFieldError(field.name, 'Please enter a valid email address');
        return false;
    }
    
    if (field.name === 'phone' && !isValidPhone(value)) {
        showFieldError(field.name, 'Please enter a valid phone number');
        return false;
    }
    
    return true;
}

// Clear field validation
function clearValidation(e) {
    const field = e.target;
    field.classList.remove('invalid');
    
    const errorElement = field.parentNode.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

// Show field error
function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName);
    field.classList.add('invalid');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message show';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
}

// Email validation regex
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Phone validation regex
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{3,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Edit contact
function editContact(id) {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    
    editingContactId = id;
    
    // Fill form with contact data
    document.getElementById('firstName').value = contact.firstName;
    document.getElementById('lastName').value = contact.lastName;
    document.getElementById('address').value = contact.address;
    document.getElementById('email').value = contact.email;
    document.getElementById('phone').value = contact.phone;
    
    // Update form UI
    formTitle.textContent = 'Edit Contact';
    submitBtn.textContent = 'Update Contact';
    cancelBtn.style.display = 'inline-block';
    
    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

// Cancel edit
function cancelEdit() {
    editingContactId = null;
    contactForm.reset();
    formTitle.textContent = 'Add New Contact';
    submitBtn.textContent = 'Add Contact';
    cancelBtn.style.display = 'none';
    
    // Clear validation
    const inputs = contactForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.classList.remove('invalid');
        const errorElement = input.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    });
}

// Delete contact
async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/contacts/${id}`, 'DELETE');
        showMessage('Contact deleted successfully!', 'success');
        loadContacts();
        
        // If we were editing this contact, cancel the edit
        if (editingContactId === id) {
            cancelEdit();
        }
    } catch (error) {
        console.error('Error deleting contact:', error);
    }
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!searchTerm) {
        renderContacts(contacts);
        return;
    }
    
    const filteredContacts = contacts.filter(contact => 
        contact.firstName.toLowerCase().includes(searchTerm) ||
        contact.lastName.toLowerCase().includes(searchTerm) ||
        contact.email.toLowerCase().includes(searchTerm) ||
        contact.phone.includes(searchTerm)
    );
    
    renderContacts(filteredContacts);
}

// Render contacts
function renderContacts(contactsToRender) {
    if (contactsToRender.length === 0) {
        renderEmptyState();
        return;
    }
    
    const contactsHTML = contactsToRender.map(contact => `
        <div class="contact-card">
            <div class="contact-info">
                <div>
                    <label>First Name:</label>
                    <span>${escapeHtml(contact.firstName)}</span>
                </div>
                <div>
                    <label>Last Name:</label>
                    <span>${escapeHtml(contact.lastName)}</span>
                </div>
                <div>
                    <label>Email:</label>
                    <span>${escapeHtml(contact.email)}</span>
                </div>
                <div>
                    <label>Phone:</label>
                    <span>${escapeHtml(contact.phone)}</span>
                </div>
                <div style="grid-column: 1 / -1;">
                    <label>Address:</label>
                    <span>${escapeHtml(contact.address)}</span>
                </div>
            </div>
            <div class="contact-actions">
                <button class="btn-edit" onclick="editContact(${contact.id})">
                    ✏️ Edit
                </button>
                <button class="btn-delete" onclick="deleteContact(${contact.id})">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
    
    contactsContainer.innerHTML = contactsHTML;
    updateContactCount(contactsToRender.length);
}

// Render empty state
function renderEmptyState() {
    contactsContainer.innerHTML = `
        <div class="empty-state">
            <h3>No contacts found</h3>
            <p>Add your first contact using the form above</p>
        </div>
    `;
    updateContactCount(0);
}

// Update contact count
function updateContactCount(count) {
    contactCount.textContent = count;
}

// Show loading spinner
function showLoading() {
    loading.style.display = 'flex';
}

// Hide loading spinner
function hideLoading() {
    loading.style.display = 'none';
}

// Show message
function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        message.style.display = 'none';
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}