from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
import random
from pyairtable import Api

# Configure Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

app = FastAPI()

# Define allowed origins
origins = [
    "http://localhost:3000",
    "https://heatheramz.github.io/historybytes/",
    "null",  # Allow file:// protocol access for local HTML files
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Input model for the API
class SummaryRequest(BaseModel):
    topic: str
    ageGroup: str

# Input model for authentication
class AuthRequest(BaseModel):
    password: str

# Input model for quiz grading
class QuizRequest(BaseModel):
    user_definition: str
    vocabulary_word: str
    historical_context: str

# --- Airtable Integration ---
def get_random_vocabulary_word(age_group: str) -> str:
    """
    Fetches a random vocabulary word from Airtable for the specified age group.
    """
    try:
        # Get Airtable credentials from environment variables
        airtable_token = os.getenv("AIRTABLE_API_TOKEN")
        airtable_base_id = os.getenv("AIRTABLE_BASE_ID")
        
        if not airtable_token or not airtable_base_id:
            return None
        
        # Initialize Airtable API
        api = Api(airtable_token)
        table = api.table(airtable_base_id, "Vocabulary_Words")
        
        # Fetch records where age_group field contains the specified age group
        records = table.all(formula=f"FIND('{age_group}', {{age_group}})")
        
        if not records:
            return None
        
        # Select a random word from the results
        random_record = random.choice(records)
        vocabulary_word = random_record['fields'].get('word', '')
        
        return vocabulary_word
        
    except Exception as e:
        return None

# --- AI Agent Logic ---
def call_gemini(prompt: str) -> str:
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error communicating with AI model.")

def research_agent(topic: str) -> str:
    prompt = f"""You are a highly skilled historical researcher. Your task is to gather key facts and concepts about the following historical topic. Provide a concise, factual summary (around 200-300 words) that includes the main events, key figures, and their significance. Focus on accuracy and neutrality. Do NOT include any opinion or age-specific language.
    The topic is: "{topic}"
    """
    return call_gemini(prompt)

def writer_agent(summary: str, age_group: str, vocabulary_word: str = None) -> str:
    base_prompt = f"""You are a talented educational writer specializing in adapting complex historical information for specific age groups. Your task is to rewrite the following factual summary for a target audience of age group '{age_group}'. Ensure the language, vocabulary, and concepts are appropriate for that age, making it engaging and easy to understand without losing accuracy.

    The factual summary to adapt is:
    \"\"\"
    {summary}
    \"\"\"

    Example age group adaptations:
    - 5-8: Simple words, short sentences, focus on a core story. Use very basic vocabulary.
    - 9-12: Slightly more detail, engaging narrative, introduce simple cause-effect. Use common vocabulary.
    - 13-18: More historical context, introduce complexities, encourage critical thinking. Use academic-appropriate vocabulary.
    - Adult: Maintain detail, sophisticated vocabulary, academic rigor. Assume prior knowledge."""
    
    if vocabulary_word:
        vocabulary_prompt = f"""

    IMPORTANT VOCABULARY REQUIREMENT: You must naturally incorporate the vocabulary word "{vocabulary_word}" into your historical summary. Use the word in its proper context based on your knowledge of its definition. The word should fit seamlessly into the narrative and enhance the educational value. Do not force the word - use it where it makes sense contextually within the historical content."""
        
        prompt = base_prompt + vocabulary_prompt
    else:
        prompt = base_prompt
    
    return call_gemini(prompt)

def quiz_agent(user_definition: str, vocabulary_word: str, historical_context: str) -> dict:
    """
    Quiz Agent that grades user's definition of vocabulary word based on historical context.
    Returns a dictionary with is_correct, feedback, and correct_definition.
    """
    prompt = f"""You are an encouraging educational Quiz Agent. A student has just read a historical summary and is being quizzed on the vocabulary word "{vocabulary_word}" that appeared in the text.

    Historical context where the word was used:
    \"\"\"{historical_context}\"\"\"

    Student's definition:
    \"\"\"{user_definition}\"\"\"

    Your task:
    1. Determine if the student's definition demonstrates understanding of how "{vocabulary_word}" was used in the historical context
    2. Provide encouraging feedback regardless of correctness
    3. If correct: Start with "That's right!" and reinforce the definition in context
    4. If incorrect: Start with "Not quite." and explain what the word means in this historical context
    5. End with encouragement to explore another topic
    6. For the correct_definition, format it as "Definition of {vocabulary_word}: [your definition here]"

    CRITICAL: You must respond with ONLY valid JSON in this exact format:
    {{"is_correct": true, "feedback": "Your encouraging response here", "correct_definition": "Definition of {vocabulary_word}: Brief definition of the word as used in this historical context"}}

    Do not include any text before or after the JSON. Be encouraging, educational, and contextually accurate."""
    
    try:
        response_text = call_gemini(prompt)
        
        # Clean the response - remove any markdown formatting or extra text
        cleaned_response = response_text.strip()
        
        # Look for JSON content between curly braces
        import re
        json_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
        if json_match:
            json_text = json_match.group(0)
        else:
            json_text = cleaned_response
        
        # Try to parse the JSON response
        import json
        response_data = json.loads(json_text)
        
        # Validate required keys
        if not all(key in response_data for key in ['is_correct', 'feedback', 'correct_definition']):
            raise ValueError("Missing required keys in response")
            
        return response_data
        
    except json.JSONDecodeError as e:
        # Try to extract information from non-JSON response
        is_correct = "that's right" in response_text.lower() or "correct" in response_text.lower()
        
        # Create a proper response based on the raw text
        if is_correct:
            feedback = f"That's right! {response_text[:200]}..."
        else:
            feedback = f"Not quite. {response_text[:200]}..."
            
        return {
            "is_correct": is_correct,
            "feedback": feedback,
            "correct_definition": f"The word '{vocabulary_word}' means to show displeasure or unhappiness, as used in this historical context."
        }
        
    except Exception as e:
        return {
            "is_correct": False,
            "feedback": "There was an error processing your quiz response. Please try again!",
            "correct_definition": f"The word '{vocabulary_word}' is an important vocabulary term in this historical context."
        }

# --- FastAPI Endpoints ---
@app.post("/authenticate")
async def authenticate(request: AuthRequest):
    # Get the correct password from environment variables
    correct_password = os.getenv("LOGIN_PASSWORD")
    
    if not correct_password:
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    # Validate the password
    if request.password == correct_password:
        return {"success": True, "message": "Authentication successful"}
    else:
        raise HTTPException(status_code=401, detail="Incorrect password")

@app.post("/generate-summary")
async def generate_summary(request: SummaryRequest):
    # Validate inputs
    if not request.topic or not request.topic.strip():
        raise HTTPException(status_code=422, detail="Topic cannot be empty")
    if not request.ageGroup or not request.ageGroup.strip():
        raise HTTPException(status_code=422, detail="Age group cannot be empty")
    
    try:
        # Step 1: Get vocabulary word for the age group
        vocabulary_word = get_random_vocabulary_word(request.ageGroup)

        # Step 2: Researcher Agent
        research_summary = research_agent(request.topic)
        if not research_summary:
            raise HTTPException(status_code=500, detail="Researcher agent failed to produce summary.")

        # Step 3: Writer Agent with vocabulary word
        final_summary = writer_agent(research_summary, request.ageGroup, vocabulary_word)
        if not final_summary:
            raise HTTPException(status_code=500, detail="Writer agent failed to produce final summary.")
        
        # Return response with vocabulary word for frontend highlighting
        response_data = {"response": final_summary}
        if vocabulary_word:
            response_data["vocabulary_word"] = vocabulary_word
            
        return response_data

    except HTTPException as e:
        raise e # Re-raise FastAPI HTTP exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.post("/grade-quiz")
async def grade_quiz(request: QuizRequest):
    # Validate inputs
    if not request.user_definition or not request.user_definition.strip():
        raise HTTPException(status_code=422, detail="User definition cannot be empty")
    if not request.vocabulary_word or not request.vocabulary_word.strip():
        raise HTTPException(status_code=422, detail="Vocabulary word cannot be empty")
    if not request.historical_context or not request.historical_context.strip():
        raise HTTPException(status_code=422, detail="Historical context cannot be empty")
    
    try:
        quiz_result = quiz_agent(request.user_definition, request.vocabulary_word, request.historical_context)
        return quiz_result

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while grading quiz: {str(e)}")

# Add a root endpoint for health check or welcome message
@app.get("/")
async def read_root():
    return {"message": "Historical Summary Agent API is running!"}
