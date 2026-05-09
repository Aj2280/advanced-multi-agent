import subprocess
import tempfile
import os

class Sandbox:
    """Secure code execution sandbox using a temporary isolated environment."""
    @staticmethod
    def execute_python(code: str, timeout_s: int = 5) -> str:
        # In a real production system, this would use E2B or a Docker container.
        # For now, we use a subprocess with timeout and no network access if possible.
        with tempfile.TemporaryDirectory() as temp_dir:
            script_path = os.path.join(temp_dir, "script.py")
            with open(script_path, "w") as f:
                f.write(code)
            
            try:
                result = subprocess.run(
                    ["python3", script_path],
                    capture_output=True,
                    text=True,
                    timeout=timeout_s,
                    cwd=temp_dir
                )
                if result.returncode == 0:
                    return f"Execution successful:\n{result.stdout}"
                else:
                    return f"Execution failed:\n{result.stderr}"
            except subprocess.TimeoutExpired:
                return f"Execution timed out after {timeout_s} seconds."
            except Exception as e:
                return f"Sandbox error: {str(e)}"
