from typing import Any, Callable, Dict
import json
import inspect

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, dict] = {}

    def register(self, name: str, func: Callable, description: str):
        self._tools[name] = func
        # Generate basic JSON schema for tool
        sig = inspect.signature(func)
        params = {}
        for param_name, param in sig.parameters.items():
            if param_name == "self": continue
            params[param_name] = {"type": "string"} # simplified schema
            
        self._schemas[name] = {
            "type": "function",
            "function": {
                "name": name,
                "description": description,
                "parameters": {
                    "type": "object",
                    "properties": params,
                    "required": list(params.keys())
                }
            }
        }

    def execute(self, name: str, kwargs: dict) -> Any:
        if name not in self._tools:
            raise ValueError(f"Tool {name} not found")
        return self._tools[name](**kwargs)

    def get_schemas(self) -> list[dict]:
        return list(self._schemas.values())

registry = ToolRegistry()
