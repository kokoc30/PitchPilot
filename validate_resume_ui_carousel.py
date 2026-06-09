import os
import sys
import time
import json
import urllib.request
import urllib.error
from playwright.sync_api import sync_playwright

def create_confirmed_user(email, password, full_name):
    print("Reading Supabase keys from backend env...")
    supabase_url = None
    service_key = None
    try:
        with open("backend/.env", "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line:
                    key, val = line.strip().split("=", 1)
                    if key.strip() == "SUPABASE_URL":
                        supabase_url = val.strip().strip('"').strip("'")
                    elif key.strip() == "SUPABASE_SERVICE_ROLE_KEY":
                        service_key = val.strip().strip('"').strip("'")
    except Exception as e:
        print(f"Error reading backend .env: {e}")
        return False

    if not supabase_url or not service_key:
        print("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in backend .env")
        return False

    url = f"{supabase_url.rstrip('/')}/auth/v1/admin/users"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {
            "full_name": full_name
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode("utf-8"))
            print(f"User created & auto-confirmed: {data.get('email')}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"HTTP Response creating user: {e.code} - {err_body}")
        if "already exists" in err_body or "already_exists" in err_body:
            print("User already exists, proceeding to login.")
            return True
        return False
    except Exception as e:
        print(f"Failed to create confirmed user: {e}")
        return False

def run_validation():
    timestamp = int(time.time())
    test_email = f"carousel_test_{timestamp}@gmail.com"
    test_password = "password123"
    
    # Pre-create auto-confirmed user
    success = create_confirmed_user(test_email, test_password, "Test User")
    if not success:
        print("Failed to pre-create user. Trying to proceed anyway...")

    print("Starting custom Playwright validation for Resume-Question carousel UI...")
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.grant_permissions(['camera', 'microphone'])
        page = context.new_page()

        try:
            # 1. Log in with confirmed user
            print("Navigating to login page...")
            page.goto('http://localhost:5473/login')
            page.wait_for_load_state('networkidle')
            
            print(f"Logging in with: {test_email}")
            page.fill('input[type="email"]', test_email)
            page.fill('input[type="password"]', test_password)
            page.click('button[type="submit"]')
            
            print("Waiting for redirection to dashboard...")
            page.wait_for_url('**/dashboard', timeout=15000)
            page.wait_for_load_state('networkidle')
            print("Successfully logged in and reached dashboard.")
            
            # 2. Go to Practice page
            print("Navigating to Practice page...")
            page.click("text=Practice")
            page.wait_for_url('**/practice')
            page.wait_for_load_state('networkidle')
            time.sleep(1)

            # Enable Demo Mode to ensure we can save session
            print("Enabling Demo Mode...")
            page.click('button[role="switch"]')
            time.sleep(1)

            # 3. Select Interview Mode
            print("Selecting Interview Mode...")
            interview_btn = page.locator("button:has-text('Behavioral & technical interview rehearsals.')")
            interview_btn.click()
            time.sleep(1)
            print("Interview mode selected.")

            # 4. Check if resume upload panel and questions section are visible
            assert page.locator("text=Resume-based questions").is_visible(), "Resume upload panel should be visible in Interview mode"
            print("Resume-based questions panel is visible.")

            # 5. Upload a dummy resume to enable generation
            if page.locator("text=No resumes uploaded yet.").is_visible():
                print("No resumes found, uploading dummy resume...")
                dummy_resume_path = os.path.abspath("dummy_resume.txt")
                with open(dummy_resume_path, "w", encoding="utf-8") as f:
                    f.write("John Doe\nSoftware Engineer with 5 years experience in React and Python.\nDeveloped scalable web applications and led engineering teams.")
                
                page.set_input_files('input[type="file"]', dummy_resume_path)
                time.sleep(1)
                
                # Click upload button
                upload_btn = page.locator("button:has-text('Upload resume')")
                upload_btn.click()
                print("Waiting for resume processing...")
                # Wait for upload status to say "processed"
                page.wait_for_selector("text=Resume processed and embedded.", timeout=25000)
                print("Resume uploaded successfully.")
                
                # Cleanup dummy file
                try:
                    os.remove(dummy_resume_path)
                except OSError:
                    pass

            # Ensure a resume is selected
            if not page.locator("text=Selected resume").is_visible():
                print("Selected resume details not visible, clicking Select button manually...")
                page.locator("button:has-text('Select')").first.click()
                time.sleep(2)

            assert page.locator("text=Selected resume").is_visible(), "A resume should be selected"
            print("Selected resume exists.")

            # 6. Check if Question history is collapsed by default (now that resume is selected)
            history_btn = page.locator("button:has-text('Question history')")
            assert history_btn.is_visible(), "Question history toggle button should be visible"
            # Ensure the history panel itself is not rendered (collapsed)
            assert not page.locator("text=Clear generated").is_visible(), "History panel should be collapsed by default"
            print("Question history is collapsed by default: Checked.")

            # 7. Click Generate Questions
            print("Clicking Generate questions...")
            gen_btn = page.locator("button.bg-indigo-500:has-text('Generate questions')")
            gen_btn.click()
            
            # Wait for questions to generate
            print("Waiting for question generation...")
            page.wait_for_selector("text=Question 1 of", timeout=25000)
            print("Question generation succeeded!")

            # 8. Check that the large generated-question list is NOT visible
            assert not page.locator("text=Clear generated").is_visible(), "Large list of generated questions should NOT appear on page"
            print("Large generated list is absent by default: Checked.")

            # 9. Verify CurrentQuestionPanel state
            current_question_header = page.locator("text=Question 1 of")
            assert current_question_header.is_visible(), "CurrentQuestionPanel should display 'Question 1 of N'"
            print("Auto-selected first question ('Question 1 of N') shown: Checked.")

            # Get the text of the first question
            q1_text = page.locator("p.text-white.md\\:text-\\[17px\\]").text_content()
            print(f"First Question: '{q1_text}'")

            # 10. Test queue navigation: Next Question / Skip / Previous
            print("Testing Next Question...")
            next_btn = page.locator("button:has-text('Next Question')")
            assert next_btn.is_visible(), "Next Question button should be visible"
            next_btn.click()
            time.sleep(1)

            # Check that it updated to Question 2
            assert page.locator("text=Question 2 of").is_visible(), "Should advance to Question 2 of N"
            q2_text = page.locator("p.text-white.md\\:text-\\[17px\\]").text_content()
            print(f"Second Question: '{q2_text}'")
            assert q1_text != q2_text, "Question text should change on next"

            print("Testing Previous Question...")
            prev_btn = page.locator("button:has-text('Previous')")
            assert prev_btn.is_visible(), "Previous button should be visible on Q2"
            prev_btn.click()
            time.sleep(1)

            # Check that it updated back to Question 1
            assert page.locator("text=Question 1 of").is_visible(), "Should go back to Question 1 of N"
            q1_back_text = page.locator("p.text-white.md\\:text-\\[17px\\]").text_content()
            assert q1_text == q1_back_text, "Question text should go back to Q1"
            print("Previous question navigation: Checked.")

            # Test Skip button
            print("Testing Skip button...")
            skip_btn = page.locator("button:has-text('Skip')")
            assert skip_btn.is_visible(), "Skip button should be visible on Q1"
            skip_btn.click()
            time.sleep(1)
            assert page.locator("text=Question 2 of").is_visible(), "Skip should advance to Question 2"
            print("Skip question navigation: Checked.")

            # 11. Run through the rest of the queue to verify the "No more questions" state
            print("Running through the rest of the queue...")
            while page.locator("button:has-text('Next Question')").is_visible():
                page.locator("button:has-text('Next Question')").click()
                time.sleep(0.5)

            # Click Finish Queue
            finish_btn = page.locator("button:has-text('Finish Queue')")
            if finish_btn.is_visible():
                finish_btn.click()
                time.sleep(1)

            # Verify "No more questions" state
            assert page.locator("text=No more questions").is_visible(), "No more questions state should appear at the end"
            assert page.locator("button:has-text('Regenerate Questions')").is_visible(), "Regenerate Questions button should be visible on end screen"
            print("No more questions end state: Checked.")

            # 12. Click Regenerate on the end screen
            print("Testing Regenerate from end screen...")
            page.locator("button:has-text('Regenerate Questions')").click()
            print("Waiting for regeneration...")
            page.wait_for_selector("text=Question 1 of", timeout=25000)
            print("Regenerate created new queue and auto-selected first question: Checked.")

            # 13. Expand History and select a question
            print("Testing History when expanded...")
            history_btn.click()
            time.sleep(1)
            assert page.locator("text=Clear generated").is_visible(), "History panel elements should appear when expanded"
            
            # Search/filter elements check
            assert page.locator("input[placeholder*='Search']").is_visible(), "Search bar should appear when history is expanded"
            print("History expanded elements: Checked.")

            # Click a question from history/generated list to practice
            practice_btn = page.locator("button:has-text('Practice this')").first
            assert practice_btn.is_visible(), "Practice this button should be visible in history"
            # Get text of the question card containing this button
            row_text = page.locator("article:has(button:has-text('Practice this'))").first.locator("p").first.text_content()
            practice_btn.click()
            time.sleep(1)
            selected_q_text = page.locator("p.text-white.md\\:text-\\[17px\\]").text_content()
            assert row_text.strip() == selected_q_text.strip(), "Selected question should match the clicked one from history"
            print("Manual selection from History: Checked.")
            
            # Collapse history back
            history_btn.click()
            time.sleep(1)

            # 14. Save Session and Dashboard check
            print("Starting practice session to test save...")
            page.click("button:has-text('Start practice')")
            time.sleep(2)
            page.click("button:has-text('Pause practice')")
            time.sleep(1)

            # Click Save Session
            print("Clicking Save Session...")
            page.click("button:has-text('Save Session')")
            time.sleep(2)

            # Go to Dashboard and verify
            print("Verifying saved session on Dashboard...")
            page.goto('http://localhost:5473/dashboard')
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            view_btn = page.locator("button:has-text('View')").first
            view_btn.click()
            time.sleep(1.5)
            
            # Confirm practiced question shows up in detail panel
            assert page.locator("text=Practiced question").is_visible(), "Practiced question card should be visible in session details"
            print("Save Session and Dashboard detail: Checked.")

            print("\nALL Carousel UI tests passed successfully!")

        except Exception as e:
            print(f"\nValidation FAILED with error: {e}")
            page.screenshot(path="carousel_validation_error.png")
            print("Screenshot saved to carousel_validation_error.png")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_validation()
