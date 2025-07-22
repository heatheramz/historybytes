// Try multiple backend URLs in case one is not working
// Local development server first for testing
const possibleBackendUrls = [
    'http://127.0.0.1:8000',  // Local development server
    'http://localhost:8000',  // Alternative localhost
    'https://historybytes.redirectme.net',
    'https://146.235.217.15:8000',
    // HTTP URLs as fallback (will cause mixed content warnings on HTTPS sites)
    'http://historybytes.redirectme.net',
    'http://146.235.217.15:8000',
];

// Display current connection issues for debugging
console.error('🚨 CONNECTION ISSUES DETECTED:');
console.error('1. historybytes.redirectme.net - Connection timeout (domain/DNS issue)');
console.error('2. https://146.235.217.15:8000 - SSL protocol error (no valid certificate)');
console.error('3. HTTP requests blocked by mixed content security');
console.error('');
console.error('🔧 IMMEDIATE SOLUTIONS:');
console.error('Option A: Fix your domain SSL certificate');
console.error('Option B: Use a reverse proxy service like ngrok or Cloudflare Tunnel');
console.error('Option C: Temporarily test locally (not on GitHub Pages)');

let backendBaseUrl = possibleBackendUrls[0]; // Default to first URL
const backendApiUrl = `${backendBaseUrl}/generate-summary`;
const authApiUrl = `${backendBaseUrl}/authenticate`;
const isHTTPS = window.location.protocol === 'https:';

// Enhanced mixed content detection and guidance
if (isHTTPS) {
    console.warn('🔒 GitHub Pages is running on HTTPS. Mixed content security restrictions apply.');
    console.warn('📋 To fix HTTPS issues on your Oracle VM:');
    console.warn('1. Ensure your SSL certificate is properly installed and valid');
    console.warn('2. Check that nginx is configured to serve HTTPS on port 443');
    console.warn('3. Verify your domain redirectme.net points to your Oracle VM IP');
    console.warn('4. Test direct HTTPS access: https://146.235.217.15:8000/');
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

// Quiz elements
const quizSection = document.getElementById('quiz-section');
const quizInput = document.getElementById('quiz-input');
const quizSubmitBtn = document.getElementById('quiz-submit-btn');
const quizFeedback = document.getElementById('quiz-feedback');

// Global variables to store quiz data
let currentVocabularyWord = '';
let currentHistoricalContext = '';

// Function to test backend connectivity
async function testBackendConnectivity() {
    console.log('Testing backend connectivity...');
    
    for (let i = 0; i < possibleBackendUrls.length; i++) {
        const testUrl = possibleBackendUrls[i];
        console.log(`Testing connection to: ${testUrl}`);
        
        try {
            const response = await fetch(`${testUrl}/`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
            
            if (response.ok) {
                console.log(`✅ Successfully connected to: ${testUrl}`);
                backendBaseUrl = testUrl;
                // Update the URLs
                const newBackendApiUrl = `${backendBaseUrl}/generate-summary`;
                const newAuthApiUrl = `${backendBaseUrl}/authenticate`;
                
                console.log(`Updated backend URLs:`);
                console.log(`Auth URL: ${newAuthApiUrl}`);
                console.log(`API URL: ${newBackendApiUrl}`);
                
                return { success: true, url: testUrl, authUrl: newAuthApiUrl, apiUrl: newBackendApiUrl };
            }
        } catch (error) {
            console.log(`❌ Failed to connect to ${testUrl}: ${error.message}`);
        }
    }
    
    return { success: false, error: 'No backend servers are reachable' };
}

// Test connectivity on page load
window.addEventListener('load', async () => {
    const result = await testBackendConnectivity();
    if (result.success) {
        statusMessageDiv.textContent = `Connected to backend: ${result.url}`;
        statusMessageDiv.className = 'status-message';
    } else {
        statusMessageDiv.textContent = `⚠️ Cannot connect to backend servers. Please check if your Oracle VM is running and accessible.`;
        statusMessageDiv.className = 'status-message error-message';
    }
});

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
    
    // Use the current backend URL
    const currentAuthUrl = `${backendBaseUrl}/authenticate`;
    console.log('Attempting authentication to:', currentAuthUrl);
    
    try {
        const response = await fetch(currentAuthUrl, {
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

    // Use the current backend URL
    const currentApiUrl = `${backendBaseUrl}/generate-summary`;
    console.log('Attempting to generate summary for topic:', topic, 'age group:', ageGroup);
    console.log('Backend URL:', currentApiUrl);

    try {
        const response = await fetch(currentApiUrl, {
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
        const vocabularyWord = data.vocabulary_word;

        statusMessageDiv.textContent = 'Status: Summary generated successfully!';
        
        // Display summary with vocabulary highlighting if a word was provided
        if (vocabularyWord) {
            summaryOutputDiv.innerHTML = highlightVocabularyWord(summary, vocabularyWord);
            console.log('Highlighted vocabulary word:', vocabularyWord);
            
            // Store quiz data and show quiz section
            currentVocabularyWord = vocabularyWord;
            currentHistoricalContext = summary;
            showQuizSection(vocabularyWord);
        } else {
            summaryOutputDiv.textContent = summary;
            hideQuizSection();
        }

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

// Function to highlight vocabulary word in the summary text
function highlightVocabularyWord(summaryText, vocabularyWord) {
    if (!vocabularyWord || !summaryText) {
        console.log('Missing vocabulary word or summary text');
        return summaryText;
    }
    
    console.log('Attempting to highlight word:', vocabularyWord);
    console.log('In text (first 200 chars):', summaryText.substring(0, 200));
    
    // Escape special regex characters in the vocabulary word
    const escapedWord = vocabularyWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Try multiple matching strategies for better coverage
    let highlightedText = summaryText;
    let matchFound = false;
    
    // Strategy 1: Exact word boundary match (case-insensitive)
    const exactRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    if (exactRegex.test(summaryText)) {
        highlightedText = summaryText.replace(exactRegex, (match) => {
            console.log('Found exact match:', match);
            matchFound = true;
            return `<span class="vocabulary-highlight">${match}</span>`;
        });
    }
    
    // Strategy 2: If no exact match, try partial word matching (for compound words or variations)
    if (!matchFound) {
        const partialRegex = new RegExp(`${escapedWord}`, 'gi');
        if (partialRegex.test(summaryText)) {
            highlightedText = summaryText.replace(partialRegex, (match) => {
                console.log('Found partial match:', match);
                matchFound = true;
                return `<span class="vocabulary-highlight">${match}</span>`;
            });
        }
    }
    
    // Strategy 3: Try matching different word forms (plurals, past tense, etc.)
    if (!matchFound) {
        // Remove common suffixes and try again
        const baseWord = vocabularyWord.replace(/(s|es|ed|ing|ly|tion|sion)$/i, '');
        if (baseWord !== vocabularyWord && baseWord.length > 2) {
            const baseRegex = new RegExp(`\\b${baseWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b`, 'gi');
            if (baseRegex.test(summaryText)) {
                highlightedText = summaryText.replace(baseRegex, (match) => {
                    console.log('Found base word match:', match);
                    matchFound = true;
                    return `<span class="vocabulary-highlight">${match}</span>`;
                });
            }
        }
    }
    
    if (!matchFound) {
        console.log('No matches found for vocabulary word:', vocabularyWord);
        console.log('Full text to search:', summaryText);
    } else {
        console.log('Successfully highlighted vocabulary word');
    }
    
    return highlightedText;
}

// Quiz functionality
function showQuizSection(vocabularyWord) {
    const quizQuestion = document.getElementById('quiz-question');
    quizQuestion.innerHTML = `Can you define the highlighted vocabulary word "<strong>${vocabularyWord}</strong>" based on what you just read? Write your definition below:`;
    
    // Reset quiz state
    quizInput.value = '';
    quizFeedback.classList.add('hidden');
    quizFeedback.innerHTML = '';
    quizSubmitBtn.disabled = false;
    quizSubmitBtn.textContent = 'Submit Answer';
    
    // Show quiz section
    quizSection.classList.remove('hidden');
}

function hideQuizSection() {
    quizSection.classList.add('hidden');
}

// Quiz submit event listener
quizSubmitBtn.addEventListener('click', async () => {
    const userDefinition = quizInput.value.trim();
    
    if (!userDefinition) {
        alert('Please enter your definition before submitting.');
        return;
    }
    
    if (!currentVocabularyWord || !currentHistoricalContext) {
        alert('Quiz data is missing. Please generate a new summary first.');
        return;
    }
    
    // Disable button and show loading state
    quizSubmitBtn.disabled = true;
    quizSubmitBtn.textContent = 'Grading...';
    quizFeedback.classList.add('hidden');
    
    // Use the current backend URL for quiz grading
    const currentQuizUrl = `${backendBaseUrl}/grade-quiz`;
    console.log('Attempting to grade quiz for word:', currentVocabularyWord);
    console.log('Quiz URL:', currentQuizUrl);
    
    try {
        const response = await fetch(currentQuizUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_definition: userDefinition,
                vocabulary_word: currentVocabularyWord,
                historical_context: currentHistoricalContext
            }),
        });
        
        console.log('Quiz grading response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.log('Quiz grading error data:', errorData);
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorData.detail}`);
        }
        
        const quizResult = await response.json();
        console.log('Quiz grading successful, response data:', quizResult);
        
        // Display feedback
        displayQuizFeedback(quizResult);
        
    } catch (error) {
        console.error('Error grading quiz details:', error);
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        
        // Display error feedback
        displayQuizFeedback({
            is_correct: false,
            feedback: 'There was an error grading your quiz. Please try again or generate a new summary.',
            correct_definition: `The word "${currentVocabularyWord}" is an important vocabulary term.`
        });
        
    } finally {
        // Reset button state
        quizSubmitBtn.disabled = false;
        quizSubmitBtn.textContent = 'Submit Answer';
    }
});

// Function to display quiz feedback
function displayQuizFeedback(quizResult) {
    const isCorrect = quizResult.is_correct;
    const feedback = quizResult.feedback;
    const correctDefinition = quizResult.correct_definition;
    
    // Set feedback content - keep feedback as normal text, not bold
    let feedbackHtml = `${feedback}`;
    
    if (correctDefinition) {
        console.log('Processing definition:', correctDefinition);
        
        // Simple approach: find the first colon and split there
        const colonIndex = correctDefinition.indexOf(':');
        if (colonIndex !== -1 && correctDefinition.startsWith('Definition of ')) {
            const boldPart = correctDefinition.substring(0, colonIndex + 1); // "Definition of [word]:"
            const normalPart = correctDefinition.substring(colonIndex + 1).trim(); // The actual definition
            console.log('Bold part:', boldPart);
            console.log('Normal part:', normalPart);
            feedbackHtml += `<br><br><strong>${boldPart}</strong> ${normalPart}`;
        } else {
            // Fallback - just display as is
            console.log('Definition format not recognized, using fallback:', correctDefinition);
            feedbackHtml += `<br><br>${correctDefinition}`;
        }
    }
    
    // Add encouragement to explore more topics with link to top
    feedbackHtml += `<br><br>Ready to explore another historical topic and discover a new vocabulary word? <a href="#top" class="start-new-topic-link">Start a new topic</a>`;
    
    quizFeedback.innerHTML = feedbackHtml;
    
    // Set appropriate CSS class for styling
    quizFeedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    
    // Show feedback
    quizFeedback.classList.remove('hidden');
}

// Allow Enter key to submit quiz answer
quizInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        quizSubmitBtn.click();
    }
});

// Ensure dropdown shows selected value properly
ageGroupSelect.addEventListener('change', function() {
    if (this.value) {
        // Find the selected option text and update display if needed
        const selectedOption = this.options[this.selectedIndex];
        console.log('Selected age group:', selectedOption.text);
    }
});
