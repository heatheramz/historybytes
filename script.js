const backendApiUrl = 'http://127.0.0.1:8000/generate-summary';
const authApiUrl = 'http://127.0.0.1:8000/authenticate';

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
        
        if (response.ok) {
            // Authentication successful
            authContainer.style.display = 'none';
            mainAgentContainer.classList.remove('hidden');
            authErrorMessage.textContent = '';
        } else {
            // Authentication failed
            const errorData = await response.json();
            authErrorMessage.textContent = 'Incorrect password. Please try again.';
            passwordInput.value = '';
        }
    } catch (error) {
        console.error('Authentication error:', error);
        authErrorMessage.textContent = 'Authentication failed. Please check your connection and try again.';
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

    try {
        const response = await fetch(backendApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // No 'Authorization' header here unless you add API Key auth to FastAPI itself
            },
            body: JSON.stringify({
                topic: topic,
                ageGroup: ageGroup,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json(); // FastAPI returns JSON for errors
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorData.detail}`);
        }

        const data = await response.json();
        const summary = data.response;

        statusMessageDiv.textContent = 'Status: Summary generated successfully!';
        summaryOutputDiv.textContent = summary;

    } catch (error) {
        console.error('Error generating summary:', error);
        statusMessageDiv.className = 'status-message error-message';
        statusMessageDiv.textContent = `Error: ${error.message}. Please check your backend server and console logs.`;
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
