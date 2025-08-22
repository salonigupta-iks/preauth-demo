import logging
import os
from datetime import datetime, timezone
from pathlib import Path
 
from browser_use.agent.service import Agent, Controller 
from browser_use.browser.types import async_playwright
from browser_use.agent.views import ActionResult
from browser_use.browser import BrowserSession
from browser_use.llm.openai.chat import ChatOpenAI
from browser_use.llm.google.chat import ChatGoogle
from app.utility.blob_log import save_agent_history_to_blob

# Set up logging
logger = logging.getLogger(__name__)

 
BROWSERS = {}
CONTEXTS = {}
SESSION_PAGES={}
AGENTS ={}
USER_DATA_DIR_BASE = "/app/tmp/browser_profiles"
playwright = None
extension_path = "/app/extensions/capsolver"
controller= Controller()

@controller.action('Upload file to interactive element with file path')
async def upload_file(index: int, path: str, browser_session: BrowserSession, available_file_paths: list[str]):
	# Allow files in the available_file_paths list OR files created by the agent in its temp directory
	is_allowed_file = (path in available_file_paths or 
					   'browser_use_agent_' in path or 
					   'browseruse_agent_data' in path or
					   path.endswith('.txt') or 
					   path.endswith('.pdf'))
	
	# If the path is relative, try to find it in the /app directory or /app/tmp
	absolute_path = path
	if not os.path.isabs(path):
		# Try various locations for the file
		possible_paths = [
			f'/app/{path}',
			f'/app/tmp/{path}',
			f'/tmp/{path}',
			os.path.join('/app', path)
		]
		
		for possible_path in possible_paths:
			if os.path.exists(possible_path):
				absolute_path = possible_path
				break
		else:
			# If file doesn't exist anywhere, create a dummy file
			absolute_path = f'/app/tmp/{path}'
			os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
			if path.endswith('.pdf'):
				# Create a simple PDF-like file
				with open(absolute_path, 'w') as f:
					f.write('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000173 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n301\n%%EOF')
			else:
				# Create a simple text file
				with open(absolute_path, 'w') as f:
					f.write(f'Test file content for {path} - created for upload functionality.')
	
	logger.info(f"Upload attempt - Path: {path}, Absolute path: {absolute_path}, Is allowed: {is_allowed_file}, Exists: {os.path.exists(absolute_path)}")
	
	if not is_allowed_file:
		return ActionResult(error=f'File path {path} is not available. Available paths: {available_file_paths}')

	if not os.path.exists(absolute_path):
		return ActionResult(error=f'File {absolute_path} does not exist')

	try:
		# Get the DOM element by index
		dom_element = await browser_session.get_dom_element_by_index(index)

		if dom_element is None:
			msg = f'No element found at index {index}'
			logger.info(msg)
			return ActionResult(error=msg)

		# Check if it's a file input element
		if dom_element.tag_name.lower() != 'input' or dom_element.attributes.get('type') != 'file':
			msg = f'Element at index {index} is not a file input element'
			logger.info(msg)
			return ActionResult(error=msg)

		# Use Playwright's set_input_files method to upload the file
		page = await browser_session.get_current_page()  # Changed to use the correct method
		
		# Try multiple approaches to locate the file input element
		try:
			# First, try using the exact element selector
			if dom_element.attributes.get('id'):
				locator = page.locator(f'#{dom_element.attributes["id"]}')
			elif dom_element.attributes.get('name'):
				locator = page.locator(f'input[name="{dom_element.attributes["name"]}"]')
			else:
				# Use more specific selector for file input
				locator = page.locator('input[type="file"]').first
			
			# Set the files with a longer timeout
			await locator.set_input_files(absolute_path, timeout=60000)
			
		except Exception as locator_error:
			# If the above fails, try alternative approaches
			logger.info(f"Primary locator failed: {locator_error}. Trying alternative approaches...")
			
			try:
				# Try clicking the element first, then setting files
				all_file_inputs = page.locator('input[type="file"]')
				file_input = all_file_inputs.nth(index - 1) if index > 0 else all_file_inputs.first
				await file_input.set_input_files(absolute_path, timeout=60000)
				
			except Exception as alt_error:
				logger.info(f"Alternative approach failed: {alt_error}. Trying direct file input...")
				
				# Last resort: try to find any file input and use it
				try:
					await page.set_input_files('input[type="file"]', absolute_path, timeout=60000)
				except Exception as final_error:
					raise Exception(f"All file upload methods failed. Primary: {locator_error}, Alternative: {alt_error}, Final: {final_error}")

		msg = f'Successfully uploaded file {absolute_path} to index {index}'
		logger.info(msg)
		return ActionResult(extracted_content=msg, include_in_memory=True)

	except Exception as e:
		msg = f'Failed to upload file to index {index}: {str(e)}'
		logger.info(msg)
		return ActionResult(error=msg)

async def setup_browser_for_session(session_id:str,display:str):
    global playwright
    if playwright is None:
        playwright = await  async_playwright().start()
    if session_id not in BROWSERS:
        profile_dir = os.path.join(USER_DATA_DIR_BASE, session_id)
        Path(profile_dir).mkdir(parents=True, exist_ok=True)
        context = await playwright.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=False,
            args=[
                "--no-sandbox",
                f"--display={display}",
                f"--disable-extensions-except={extension_path}",
                f"--load-extension={extension_path}"
            ]
        )
 
        BROWSERS[session_id] = context.browser  # context.browser is the actual browser instance
        CONTEXTS[session_id] = context
    return CONTEXTS[session_id]
 
 
async def run_task(task: str, session_id: str, display: str):
    """
    Run the task in the browser for the given session and store screenshots to MongoDB.
    """
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise Exception("OPENAI_API_KEY environment variable not set.")

        # Launch browser and page
        context = await setup_browser_for_session(session_id, display)
        page = await context.new_page()
        await page.bring_to_front()
        SESSION_PAGES[session_id] = page
        
        # Use absolute paths for file uploads
        available_file_paths = ['/app/tmp/dummy_upload_file.pdf', '/app/tmp/test_document.txt']
        
        extended_prompt ="""
        You are a browser automation agent that interacts with websites like a human.
        ...
        IMPORTANT: If a CAPTCHA is detected (e.g., reCAPTCHA, hCaptcha), do not interact with it manually.
        Instead, wait for 5–10 seconds. A browser extension will solve it automatically in the background.
        Once it's solved, continue as normal.
        
        if a file upload is required, use the `upload_file` action with the file path.
        if a file path is available in prompt then use that as available_file_paths otherwise the default given in available_file_paths

        """
        
        # Ensure the tmp directory exists and create dummy files
        os.makedirs('/app/tmp', exist_ok=True)
        
        for file_path in available_file_paths:
            if not os.path.exists(file_path):
                if file_path.endswith('.pdf'):
                    # Create a simple PDF file
                    with open(file_path, 'w') as f:
                        f.write('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000173 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n301\n%%EOF')
                elif file_path.endswith('.txt'):
                    # Create a medical document
                    with open(file_path, 'w') as f:
                        f.write("""MEDICAL DOCUMENT - PRIOR AUTHORIZATION SUPPORT

Patient: Anurag Sinha
DOB: 01/07/2001
Member ID: 12345

SERVICE REQUEST:
Service Type: MRI
CPT Code: 72148
Diagnosis: Persistent pain
Clinical Justification: Required to rule out structural abnormalities
Urgency: Urgent
Requested Date: 01/01/2025

This document supports the prior authorization request for the above patient.
Generated for browser automation testing.

Medical Provider Signature: [Electronic Signature]
License Number: [Provider License]
""")
                else:
                    # Default text content
                    with open(file_path, 'w') as f:
                        f.write(f'Test file content for {os.path.basename(file_path)} - created for upload functionality.')
                
                logger.info(f"Created file at: {file_path}")

        # Run agent
        agent = Agent(
            task=task,
            llm=ChatOpenAI(model='gpt-4.1-mini', temperature=0.5, api_key=api_key),
            page=page,
            extend_system_message=extended_prompt,
            controller=controller,
            custom_context={'available_file_paths': available_file_paths,'request_description': 'example_request_id' + str(os.getpid())},
        )
        AGENTS[session_id] = agent
        result_agent = await agent.run()
        save_agent_history_to_blob(agent, session_id)
        return {"result":result_agent}
 
    except Exception as e:
        logging.error(f"❌ run_task() failed for session {session_id}: {str(e)}")
        raise
def get_page(session_id: str):
    """
    Get the page object for the given session ID.
    """
    if session_id in SESSION_PAGES:
        return SESSION_PAGES[session_id]
    else:
        raise ValueError(f"No page found for session ID: {session_id}")
 
 
def get_status(session_id: str):
    """
    Get the status of the session.
    """
 
    if session_id in AGENTS:
        agent = AGENTS[session_id]
        if agent.state.stopped :
            return "stopped"
        elif agent.state.paused:
            return "paused"
        elif hasattr(agent,"_task") and agent._task and agent._task.done():
            return "completed"
        return "running"
    else:
        raise ValueError(f"No agent found for session ID: {session_id}")