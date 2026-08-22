import os
import json
import logging
from typing import Dict, Any, List, Optional, Tuple

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SignalCopilot")

# Try importing OpenAI client
try:
    from openai import OpenAI
except ImportError:
    logger.error("The 'openai' package is required. Please install it using: pip install openai")
    OpenAI = None

# ==========================================
# 1. KNOWLEDGE BASE: LINKEDIN SCRAPED DATA
# ==========================================
# (No hardcoded database. Data is loaded dynamically in real-time from scraped_linkedin_data.json)

# ==========================================
# 2. KNOWLEDGE BASE: WEBSCRAPER USER GUIDE
# ==========================================
WEBSCRAPER_USER_GUIDE = [
    {
        "section": "1. Signal Atlas Overview",
        "content": (
            "Welcome to Signal Atlas! This platform visualizes emerging technology ecosystems. "
            "It has two views: (1) The Convergence Map Dashboard, which displays pulsing opportunity hubs "
            "based on job/expansion signals, and (2) The Scraper Health Monitor, which shows the status "
            "of active web scrapers."
        )
    },
    {
        "section": "2. Using Bright Data Scraper Studio",
        "content": (
            "Signal Atlas uses Bright Data Scraper Studio as its core web scraping infrastructure. "
            "To create a new custom scraper for any public page, run the command:\n"
            "`bdata scraper create <target_url> --name <collector_name> \"<instructions>\"`\n"
            "This creates a unique Collector ID (e.g. `c_startup_news`) generated from your natural-language prompts."
        )
    },
    {
        "section": "3. Running Scrapers via CLI",
        "content": (
            "To execute data collection on demand, run the scraper via CLI:\n"
            "`bdata scraper run --urls \"<target_url>\" --name \"<collector_id>\" --json -o output.json`\n"
            "This fetches dynamic, dynamic JavaScript, or static HTML web pages using Bright Data's Web Unlocker proxies."
        )
    },
    {
        "section": "4. Diagnosing Scraper Breakages",
        "content": (
            "If a website changes its HTML layout, your scraper might fail or return null fields. "
            "Check the Scraper Health Monitor. If a collector's Field Fill Rate (FFR) drops below 80%, "
            "it is marked as DEGRADED (🔴). This means a layout change has broken the selectors."
        )
    },
    {
        "section": "5. Executing Scraper Self-Healing",
        "content": (
            "To repair a broken scraper without changing your application code, run the self-healing command:\n"
            "`bdata scraper heal <collector_id> \"<feedback_on_new_selectors>\"`\n"
            "This prompts Scraper Studio AI to re-analyze the updated DOM tree and fix the CSS/XPath selectors. "
            "Verify the fixed output, and run `bdata scraper approve <collector_id>` to deploy it back to production."
        )
    }
]

# ==========================================
# 3. LIGHTWEIGHT RAG RETRIEVAL ENGINE
# ==========================================
class RAGRetriever:
    """Performs token-based TF-IDF/Keyword keyword matching over knowledge bases to retrieve relevant context."""
    
    def __init__(self):
        self.documents = []
        self._build_index()

    def _build_index(self):
        self.documents = []
        
        # Load from file if it exists
        linkedin_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scraped_linkedin_data.json")
        scraped_jobs = []
        if os.path.exists(linkedin_file):
            try:
                with open(linkedin_file, "r", encoding="utf-8") as f:
                    scraped_jobs = json.load(f)
                logger.info(f"Loaded {len(scraped_jobs)} real-time scraped jobs from {linkedin_file}")
            except Exception as e:
                logger.error(f"Error loading scraped JSON file {linkedin_file}: {e}")
        else:
            logger.warning(f"Scraped data file not found at {linkedin_file}. Please run the web scraper to populate it.")


        # Index LinkedIn jobs
        for job in scraped_jobs:
            text = (
                f"Source: {job.get('source', 'LinkedIn Jobs')}\n"
                f"Job ID: {job.get('id', 'N/A')}\n"
                f"Title: {job.get('title', 'N/A')}\n"
                f"Company: {job.get('company', 'N/A')}\n"
                f"Location: {job.get('location', 'N/A')}\n"
                f"Domain: {job.get('domain', 'N/A')}\n"
                f"Type: {job.get('type', 'N/A')}\n"
                f"Salary: {job.get('salary_range', 'N/A')}\n"
                f"Summary: {job.get('summary', 'N/A')}\n"
                f"Skills: {', '.join(job.get('skills_required', [])) if isinstance(job.get('skills_required'), list) else job.get('skills_required', 'N/A')}\n"
                f"URL: {job.get('url', 'N/A')}\n"
            )
            self.documents.append({
                "type": "linkedin_job",
                "city": job.get("location"),
                "domain": job.get("domain"),
                "text": text
            })
        
        # No longer indexing user guide inside RAG index.
        # User guide is handled statically in the system prompt.


    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieves top_k document chunks based on simple keyword token overlap (BM25-like matching)."""
        query_words = set(query.lower().replace("?", "").replace(",", "").split())
        scored_docs = []
        
        for doc in self.documents:
            doc_text_lower = doc["text"].lower()
            score = 0
            
            # Simple keyword match scoring
            for word in query_words:
                if len(word) < 3: # Ignore small stop words
                    continue
                # Weight matches in titles, fields, or section headers higher
                if word in doc_text_lower:
                    score += 1
                    if doc["type"] == "linkedin_job" and word in doc["text"].split("\n")[2].lower(): # Title line
                        score += 2
                    if doc["type"] == "user_guide" and word in doc["text"].split("\n")[0].lower(): # Section header line
                        score += 2
            
            if score > 0:
                scored_docs.append((score, doc))
        
        # Sort by score descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for score, doc in scored_docs[:top_k]]

# ==========================================
# 4. RATE LIMITING, RETRY & CHUNKING UTILITIES
# ==========================================
import time
import random
import functools

def retry_with_backoff(max_retries: int = 5, initial_delay: float = 1.0, backoff_factor: float = 2.0):
    """
    Decorator that retries an API call using exponential backoff with random jitter.
    Cleanly handles OpenAI/Groq RateLimitError (HTTP 429) and transient API errors (HTTP 500, 503).
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    err_class_name = e.__class__.__name__
                    is_rate_limit = False
                    is_transient = False

                    # Identify HTTP 429 Rate Limits and HTTP 5xx/Network transient issues
                    if err_class_name in ["RateLimitError", "APIConnectionError", "InternalServerError"]:
                        is_rate_limit = (err_class_name == "RateLimitError")
                        is_transient = True
                    elif "rate limit" in str(e).lower() or "429" in str(e):
                        is_rate_limit = True
                        is_transient = True
                    elif "500" in str(e) or "503" in str(e) or "connection" in str(e).lower():
                        is_transient = True

                    # Raise immediately if not a transient error
                    if not is_transient:
                        raise e

                    # Raise if we ran out of retries
                    if attempt == max_retries - 1:
                        logger.error(f"Max retries ({max_retries}) reached. API call failed: {e}")
                        raise e

                    # Calculate exponential delay with random jitter (prevents thundering herd problem)
                    jitter = random.uniform(0.1, 1.0)
                    sleep_time = (delay * (backoff_factor ** attempt)) + jitter

                    # Try to extract 'retry-after' or rate limit headers from the exception if present
                    retry_after_val = None
                    if is_rate_limit and hasattr(e, "response") and e.response is not None:
                        headers = e.response.headers
                        retry_after_val = headers.get("retry-after")
                        rem_requests = headers.get("x-ratelimit-remaining-requests")
                        rem_tokens = headers.get("x-ratelimit-remaining-tokens")
                        logger.warning(
                            f"OpenAI/Groq Rate Limit Hit. Remaining Requests: {rem_requests}, "
                            f"Remaining Tokens: {rem_tokens}, Retry-After Header: {retry_after_val}"
                        )
                    
                    if retry_after_val:
                        try:
                            sleep_time = max(sleep_time, float(retry_after_val))
                        except ValueError:
                            pass

                    logger.warning(
                        f"[Attempt {attempt + 1}/{max_retries}] Transient error caught: {e}. "
                        f"Retrying in {sleep_time:.2f} seconds..."
                    )
                    time.sleep(sleep_time)
            return None
        return wrapper
    return decorator

def chunk_text(text: str, max_words: int = 400) -> List[str]:
    """
    Safely splits a large crawled document payload into smaller text chunks.
    Prevents token spikes (TPM violations) when embedding payloads.
    """
    words = text.split()
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for word in words:
        current_chunk.append(word)
        current_word_count += 1
        if current_word_count >= max_words:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_word_count = 0
            
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return chunks

# Example decorated embedding fetch call
@retry_with_backoff(max_retries=5)
def get_embeddings_with_retry(client, texts: List[str], model: str = "text-embedding-3-small") -> List[List[float]]:
    """Fetches text embeddings, wrapped with our exponential backoff decorator."""
    response = client.embeddings.create(input=texts, model=model)
    return [item.embedding for item in response.data]

def get_embeddings_in_batches(client, texts: List[str], batch_size: int = 8, model: str = "text-embedding-3-small") -> List[List[float]]:
    """
    Batches raw text chunks before forwarding them to the embedding endpoint.
    Maintains clean execution within TPM/RPM caps.
    """
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        logger.info(f"Processing embedding batch {i // batch_size + 1} (Size: {len(batch)})")
        # Call the decorated function to get embeddings for this batch safely
        embeddings = get_embeddings_with_retry(client, batch)
        if embeddings:
            all_embeddings.extend(embeddings)
    return all_embeddings


# ==========================================
# 5. SIGNAL COPILOT ENGINE (GROQ-COMPATIBLE)
# ==========================================
class SignalCopilot:
    """RAG-based AI Chatbot engine configured for Groq / OpenAI API endpoints."""
    
    def __init__(self):
        # Retrieve Groq API Key, fall back to OpenAI API key
        self.api_key = os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")
        
        # Choose endpoint base url (default to Groq, fallback to OpenAI if no Groq Key but OpenAI key is present)
        if os.getenv("GROQ_API_KEY"):
            self.base_url = "https://api.groq.com/openai/v1"
            self.model = "llama3-70b-8192" # High-speed Llama 3 model on Groq
            logger.info("SignalCopilot: Configured to use Groq API endpoint.")
        else:
            self.base_url = "https://api.openai.com/v1"
            self.model = "gpt-4o" # Fallback OpenAI model
            logger.info("SignalCopilot: Configured to use standard OpenAI endpoint.")
            
        if OpenAI and self.api_key:
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        else:
            self.client = None
            logger.warning("SignalCopilot: No API key found. Running in offline fallback mode.")
            
        self.retriever = RAGRetriever()

    def _deduce_map_action(self, retrieved_docs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Scans retrieved documents to build visual map adjustments for the frontend."""
        for doc in retrieved_docs:
            if doc["type"] == "linkedin_job" and doc["city"]:
                return {
                    "action": "FOCUS_MAP",
                    "params": {
                        "city": doc["city"].capitalize(),
                        "zoom": 12,
                        "domain": doc["domain"] or "All",
                        "mode": "opportunity"
                    }
                }
        return None

    # Decorate the chat completion call with backoff protection
    def _call_completions_with_retry(self, system_prompt: str, user_prompt: str) -> Tuple[str, dict]:
        """Wrapper around Chat Completions that uses exponential backoff and audits rate limits."""
        
        @retry_with_backoff(max_retries=5)
        def _execute_api_call():
            # Retrieve with raw response to inspect the HTTP headers
            raw_response = self.client.chat.completions.with_raw_response.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0
            )
            
            # Parse standard response content
            parsed = raw_response.parse()
            text_result = parsed.choices[0].message.content
            
            # Audit real-time rate limit remaining numbers
            headers = raw_response.headers
            remaining_req = headers.get("x-ratelimit-remaining-requests")
            remaining_tok = headers.get("x-ratelimit-remaining-tokens")
            reset_req = headers.get("x-ratelimit-reset-requests")
            reset_tok = headers.get("x-ratelimit-reset-tokens")
            
            logger.info(
                f"[Rate Limit Audit] Remaining Requests: {remaining_req} (Reset: {reset_req}), "
                f"Remaining Tokens: {remaining_tok} (Reset: {reset_tok})"
            )
            
            return text_result
            
        res = _execute_api_call()
        return res

    def process_chat(self, user_message: str) -> Dict[str, Any]:
        """Processes the chat query through RAG pipeline, retrieving context and calling the LLM."""
        # Re-build/reload index in real-time to get fresh scraper results
        self.retriever._build_index()
        
        # 1. Retrieve relevant context
        retrieved = self.retriever.retrieve(user_message, top_k=3)
        
        # 2. Build Context String
        if retrieved:
            context_str = "\n---\n".join([doc["text"] for doc in retrieved])
        else:
            context_str = "No relevant context found in database."

        # 3. Check if we have an active API client, otherwise run fallback
        if not self.client:
            return self._offline_fallback(user_message, retrieved, context_str)

        try:
            # Static User Guide knowledge (Non-RAG source)
            guide_knowledge = (
                "WEBSCRAPER USER GUIDE & SITE INSTRUCTIONS:\n"
                "- Signal Atlas has two views: (1) The Convergence Map Dashboard displaying pulsing opportunity hubs based on job/expansion signals, and (2) The Scraper Health Monitor showing active web scrapers.\n"
                "- Using Bright Data Scraper Studio: To create a custom scraper, run `bdata scraper create <target_url> --name <collector_name> \"<instructions>\"`.\n"
                "- Running Scrapers via CLI: Execute data collection with `bdata scraper run --urls \"<target_url>\" --name \"<collector_id>\" --json -o scraped_linkedin_data.json`.\n"
                "- Diagnosing Scraper Breakages: Check Scraper Health Monitor. If Field Fill Rate (FFR) < 80%, status is DEGRADED (🔴), indicating broken DOM selectors.\n"
                "- Executing Scraper Self-Healing: Run `bdata scraper heal <collector_id> \"<feedback_on_selectors>\"` to prompt Scraper Studio AI to repair selectors, verify, and run `bdata scraper approve <collector_id>` to redeploy.\n"
            )

            # RAG System Prompt
            system_prompt = (
                "You are Signal Copilot, the AI assistant for Signal Atlas.\n\n"
                "CRITICAL INSTRUCTIONS:\n"
                "1. If the user asks about how to use the website, how Scraper Studio works, or how to run/heal scrapers, "
                "answer statically using the WEBSCRAPER USER GUIDE provided below. You do not need the RAG context to answer these guide-specific questions.\n"
                "2. For all queries about LinkedIn jobs, companies, salaries, or skills, you must strictly and ONLY answer using the provided RAG Context chunks. "
                "Do NOT invent, assume, or extrapolate any details. If the RAG context does not contain the answer, you must respond with: "
                "'I cannot find this information in the scraped LinkedIn database.'\n"
                "3. When listing jobs, always include the Company, Location, Salary Range, and a direct URL if available.\n"
                "4. Keep responses concise, helpful, and formatted in clean Markdown.\n\n"
                f"{guide_knowledge}"
            )

            # Combined prompt
            user_prompt = f"Context:\n{context_str}\n\nUser Question: {user_message}"

            # 4. Invoke completions with rate limit monitoring & retry safety
            text_answer = self._call_completions_with_retry(system_prompt, user_prompt)
            
            if not text_answer:
                raise Exception("Empty completion response or API failure.")

            map_action = self._deduce_map_action(retrieved)

            return {
                "answer": text_answer,
                "map_action": map_action,
                "retrieved_context": [doc["text"] for doc in retrieved]
            }

        except Exception as e:
            logger.error(f"Error calling LLM endpoint: {e}")
            return self._offline_fallback(user_message, retrieved, context_str, error=str(e))

    def _offline_fallback(self, user_message: str, retrieved: List[Dict[str, Any]], context_str: str, error: Optional[str] = None) -> Dict[str, Any]:
        """A rule-based local synthesizer if the API key or network is unavailable."""
        map_action = self._deduce_map_action(retrieved)
        
        if not retrieved:
            answer = "I cannot find this information in the scraped LinkedIn database or user guide."
        else:
            # Synthesize static local output based on retrieved text
            answer = "### Signal Copilot (Offline Fallback Mode) 🗺️\n"
            if error:
                answer += f"*(Note: API connection failed: {error})*\n\n"
            else:
                answer += "*(Note: Running in offline local synthesis mode)*\n\n"
            
            answer += "Based on local data matches:\n\n"
            for doc in retrieved:
                if doc["type"] == "linkedin_job":
                    answer += f"**Job Found:**\n{doc['text']}\n"
                else:
                    answer += f"**User Guide Info:**\n{doc['text']}\n"
                    
        return {
            "answer": answer,
            "map_action": map_action,
            "retrieved_context": [doc["text"] for doc in retrieved]
        }

# ==========================================
# 5. CLI RUNNER FOR LOCAL TESTING
# ==========================================
if __name__ == '__main__':
    print("==================================================")
    print("          SIGNAL COPILOT RAG CLI TEST RUN         ")
    print("==================================================")
    
    # Check key status
    gkey = os.getenv("GROQ_API_KEY")
    okey = os.getenv("OPENAI_API_KEY")
    if not gkey and not okey:
        print("[!] Warning: Neither GROQ_API_KEY nor OPENAI_API_KEY found.")
        print("    Running in offline fallback mode (local rule synthesis).")
    elif gkey:
        print(f"[+] GROQ_API_KEY detected. Connecting to Groq endpoint.")
    else:
        print(f"[+] OPENAI_API_KEY detected. Connecting to OpenAI endpoint.")

    copilot = SignalCopilot()
    
    print("\nAsk questions like:")
    print(" - 'Are there any Python developer jobs in Bengaluru?'")
    print(" - 'How do I run a scraper or execute self-healing?'")
    print(" - 'What is the salary for React developers in Pune?'")
    print(" - 'Who is the President of France?' (Test anti-hallucination)")
    print("-" * 50)

    while True:
        try:
            user_in = input("\nUser > ").strip()
            if not user_in:
                continue
            if user_in.lower() in ["exit", "quit"]:
                break
                
            res = copilot.process_chat(user_in)
            print(f"\nSignal Copilot:\n{res['answer']}")
            if res['map_action']:
                print(f"\nMap Action: {json.dumps(res['map_action'])}")
            print("-" * 50)
        except KeyboardInterrupt:
            print("\nExiting...")
            break
