from loguru import logger
import sys

from decouple import config

# Configure loguru
logger.remove()
logger.add(sys.stderr, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>")

# The log should just be for local use
if config('ENV_MODE', default='local') == 'local':
    try:
        logger.add("logs/backend_errors.log", rotation="10 MB", level="ERROR")
    except OSError:
        # Skip file logging in read-only environments
        pass

class ErrorLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if response.status_code >= 400:
            user = getattr(request, 'user', 'Anonymous')
            method = request.method
            path = request.get_full_path()
            
            log_msg = f"Response {response.status_code} | {method} {path} | User: {user}"
            
            if response.status_code >= 500:
                logger.error(log_msg)
            else:
                logger.warning(log_msg)
                
        return response
