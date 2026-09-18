"""
Utility functions for input validation and sanitization.
"""
import re
from html import escape


def sanitize_html(text: str) -> str:
    """
    Sanitize text input by escaping HTML special characters.
    
    This prevents XSS attacks by converting:
    - < to &lt;
    - > to &gt;
    - & to &amp;
    - " to &quot;
    - ' to &#x27;
    
    Args:
        text: Raw text input from user
        
    Returns:
        Sanitized text safe for storage and display
    """
    if not text:
        return text
    return escape(text, quote=True)


def sanitize_text_field(value: str, allow_newlines: bool = True) -> str:
    """
    Sanitize a text field by:
    1. Stripping leading/trailing whitespace
    2. Escaping HTML special characters
    3. Optionally preserving newlines
    
    Args:
        value: Raw text input
        allow_newlines: Whether to preserve newline characters
        
    Returns:
        Sanitized text
    """
    if not value:
        return value
    
    # Strip whitespace
    cleaned = value.strip()
    
    # Escape HTML
    sanitized = sanitize_html(cleaned)
    
    # Preserve newlines if allowed
    if not allow_newlines:
        sanitized = sanitized.replace('\n', ' ').replace('\r', ' ')
        # Collapse multiple spaces
        sanitized = re.sub(r'\s+', ' ', sanitized)
    
    return sanitized


def validate_no_script_tags(value: str) -> str:
    """
    Validate that text doesn't contain script tags or common XSS patterns.
    
    Raises ValueError if dangerous patterns detected.
    """
    if not value:
        return value
    
    dangerous_patterns = [
        r'<script[^>]*>',
        r'</script>',
        r'javascript:',
        r'onerror\s*=',
        r'onload\s*=',
        r'onclick\s*=',
        r'<iframe[^>]*>',
    ]
    
    lowercase_value = value.lower()
    for pattern in dangerous_patterns:
        if re.search(pattern, lowercase_value):
            raise ValueError("Input contains potentially dangerous content")
    
    return value
