// Production backend URL
const backendBaseUrl = 'https://historybytes.redirectme.net';
const backendApiUrl = `${backendBaseUrl}/generate-summary`;
const authApiUrl = `${backendBaseUrl}/authenticate`;

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
    
    // Use the backend URL for authentication
    const currentAuthUrl = authApiUrl;
    
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
        
        if (response.ok) {
            // Authentication successful
            authContainer.style.display = 'none';
            mainAgentContainer.classList.remove('hidden');
            authErrorMessage.textContent = '';
        } else {
            // Authentication failed
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            authErrorMessage.textContent = `Authentication failed: ${errorData.detail || 'Incorrect password'}`;
            passwordInput.value = '';
        }
    } catch (error) {
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

    // Use the backend URL for summary generation
    const currentApiUrl = backendApiUrl;

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

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorData.detail}`);
        }

        const data = await response.json();
        const summary = data.response;
        const vocabularyWord = data.vocabulary_word;

        statusMessageDiv.textContent = 'Status: Summary generated successfully!';
        
        // Display summary with vocabulary highlighting if a word was provided
        if (vocabularyWord) {
            summaryOutputDiv.innerHTML = highlightVocabularyWord(summary, vocabularyWord);
            
            // Store quiz data and show quiz section
            currentVocabularyWord = vocabularyWord;
            currentHistoricalContext = summary;
            showQuizSection(vocabularyWord);
        } else {
            summaryOutputDiv.textContent = summary;
            hideQuizSection();
        }

    } catch (error) {
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
        return summaryText;
    }
    
    // Escape special regex characters in the vocabulary word
    const escapedWord = vocabularyWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Try multiple matching strategies for better coverage
    let highlightedText = summaryText;
    let matchFound = false;
    
    // Strategy 1: Exact word boundary match (case-insensitive)
    const exactRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    if (exactRegex.test(summaryText)) {
        highlightedText = summaryText.replace(exactRegex, (match) => {
            matchFound = true;
            return `<span class="vocabulary-highlight">${match}</span>`;
        });
    }
    
    // Strategy 2: If no exact match, try partial word matching (for compound words or variations)
    if (!matchFound) {
        const partialRegex = new RegExp(`${escapedWord}`, 'gi');
        if (partialRegex.test(summaryText)) {
            highlightedText = summaryText.replace(partialRegex, (match) => {
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
                    matchFound = true;
                    return `<span class="vocabulary-highlight">${match}</span>`;
                });
            }
        }
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
    
    // Use the backend URL for quiz grading
    const currentQuizUrl = `${backendBaseUrl}/grade-quiz`;
    
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
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`HTTP error! Status: ${response.status}. Detail: ${errorData.detail}`);
        }
        
        const quizResult = await response.json();
        
        // Display feedback
        displayQuizFeedback(quizResult);
        
    } catch (error) {
        
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
        // Simple approach: find the first colon and split there
        const colonIndex = correctDefinition.indexOf(':');
        if (colonIndex !== -1 && correctDefinition.startsWith('Definition of ')) {
            const boldPart = correctDefinition.substring(0, colonIndex + 1); // "Definition of [word]:"
            const normalPart = correctDefinition.substring(colonIndex + 1).trim(); // The actual definition
            feedbackHtml += `<br><br><strong>${boldPart}</strong> ${normalPart}`;
        } else {
            // Fallback - just display as is
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
    }
});
