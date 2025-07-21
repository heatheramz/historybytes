const backendApiUrl = 'https://historybytes.redirectme.net/generate-summary';
const authApiUrl = 'https://historybytes.redirectme.net/authenticate';
const isHTTPS = window.location.protocol === 'https:';

// Show warning if running on HTTPS but backend is HTTP
if (isHTTPS) {
    console.warn('Running on HTTPS but backend may not support HTTPS. If you encounter connection issues, this is likely due to mixed content security restrictions.');
}

// Password authentication elements
const authContainer = document.getElementById('auth-container');
const mainAgentContainer = document.getElementById('main-agent-container');
const passwordInput = document.getElementById('password-input');
const accessButton = document.getElementById('access-button');
const authErrorMessage = document.getElementById('auth-error-message');

// Main app elements
const generateButton = document.getElementById('generate-button');
const topicInput = document.getElementById('topic-input');
const ageGroupSelect = document.getElementById('age-group-select');
const statusMessageDiv = document.getElementById('status-message');
const summaryOutputDiv = document.getElementById('summary-output');

// Password authentication logic
accessButton.addEventListener('click', async () => {
    const enteredPassword = passwordInput.value;
    
    if (!enteredPassword.trim()) {
        authErrorMessage.textContent = 'Please enter a password.';
        return;
    }
    
    // Disable button and show loading state
    accessButton.disabled = true;
    accessButton.textContent = 'Authenticating...';
    authErrorMessage.textContent = '';
    
    console.log('Attempting authentication to:', authApiUrl);
    
    try {
        const response = await fetch(authApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: enteredPassword
            }),
        });
        
        console.log('Authentication response status:', response.status);
        console.log('Authentication response headers:', response.headers);
        
        if (response.ok) {
            // Authentication successful
            console.log('Authentication successful');
            authContainer.style.display = 'none';
            mainAgentContainer.classList.remove('hidden');
            authErrorMessage.textContent = '';
        } else {
            // Authentication failed
            console.log('Authentication failed with status:', response.status);
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.log('Error data:', errorData);
            authErrorMessage.textContent = `Authentication failed: ${errorData.detail || 'Incorrect password'}`;
            passwordInput.value = '';
        }
    } catch (error) {
        console.error('Authentication error details:', error);
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            authErrorMessage.textContent = 'Connection failed. Please check if the server is running and accessible.';
        } else if (error.name === 'TypeError' && error.message.includes('CORS')) {
            authErrorMessage.textContent = 'CORS error. The server may not be configured to accept requests from this domain.';
        } else {
            authErrorMessage.textContent = `Connection error: ${error.message}`;
        }
    } finally {
        // Reset button state
        accessButton.disabled = false;
        accessButton.textContent = 'Access Application';
    }
});

// Allow Enter key to submit password
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        accessButton.click();
    }
});

generateButton.addEventListener('click', async () => {
    const topic = topicInput.value.trim();
    const ageGroup = ageGroupSelect.value;

    if (!topic || !ageGroup) {
        alert('Please enter a historical topic and select an age group.');
        return;
    }

    generateButton.disabled = true;
    statusMessageDiv.className = 'status-message';
    statusMessageDiv.textContent = 'Status: Sending request to AI agents...';
    summaryOutputDiv.textContent = '';

    console.log('Attempting to generate summary for topic:', topic, 'age group:', ageGroup);
    console.log('Backend URL:', backendApiUrl);

    try {
        const response = await fetch(backendApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: topic,
                ageGroup: ageGroup,
            }),
        });

        console.log('Summary generation response status:', response.status);
        console.log('Summary generation response headers:', response.headers);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.log('Summary generation error data:', errorData);
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorData.detail}`);
        }

        const data = await response.json();
        console.log('Summary generation successful, response data:', data);
        const summary = data.response;

        statusMessageDiv.textContent = 'Status: Summary generated successfully!';
        summaryOutputDiv.textContent = summary;

    } catch (error) {
        console.error('Error generating summary details:', error);
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        
        statusMessageDiv.className = 'status-message error-message';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            statusMessageDiv.textContent = 'Connection failed. Please check if the server is running and accessible.';
        } else if (error.name === 'TypeError' && error.message.includes('CORS')) {
            statusMessageDiv.textContent = 'CORS error. The server may not be configured to accept requests from this domain.';
        } else {
            statusMessageDiv.textContent = `Error: ${error.message}. Please check your backend server and console logs.`;
        }
        
        summaryOutputDiv.textContent = 'Could not generate summary.';
    } finally {
        generateButton.disabled = false;
    }
});

statusMessageDiv.textContent = 'Ready to generate historical summaries.';

// Ensure dropdown shows selected value properly
ageGroupSelect.addEventListener('change', function() {
    if (this.value) {
        // Find the selected option text and update display if needed
        const selectedOption = this.options[this.selectedIndex];
        console.log('Selected age group:', selectedOption.text);
    }
});
