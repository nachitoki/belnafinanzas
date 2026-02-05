
import sys

def main():
    try:
        # PowerShell '>', usually UTF-16LE
        with open("notebook_output.txt", "r", encoding="utf-16-le") as f:
            content = f.read()
            # simple filter to avoid printing megabytes of debug
            lines = content.split('\n')
            
            printing = False
            for line in lines:
                if "FITNESS SUMMARY:" in line:
                    printing = True
                    print("\n--- FOUND FITNESS SUMMARY ---")
                if "MI SALUD SUMMARY:" in line:
                    printing = True
                    print("\n--- FOUND MI SALUD SUMMARY ---")
                
                if printing:
                    # The response is oddly formatted as a repr() of a list/object
                    # We print a bit of it to capture the text
                    print(line[:1000]) # Cap line length
                    if len(line) > 1000: print("...(truncated)")
                    
                # Reset printing if we see the start of the next section or end
                # Actually, query_notebooks prints SUMMARY then the response.
                # The response object repr might be multiline or single line.
                
    except Exception as e:
        print(f"Error reading utf-16-le: {e}")
        # Try utf-8 just in case
        try:
            with open("notebook_output.txt", "r", encoding="utf-8") as f:
                print(f.read()[:2000])
        except Exception as e2:
            print(f"Error reading utf-8: {e2}")

if __name__ == "__main__":
    main()
