"""
Rate limiting functionality for ChordMe authentication endpoints.

Provides simple in-memory rate limiting to prevent brute force attacks
and DoS attempts on login and registration endpoints.
"""

import time
from collections import defaultdict, deque
from flask import request, current_app
from functools import wraps


class RateLimiter:
    """Simple in-memory rate limiter with sliding window approach."""
    
    def __init__(self):
        # Store request timestamps per IP address
        self.requests = defaultdict(deque)
        # Store blocked IPs with block expiration time
        self.blocked_ips = {}
    
    def is_rate_limited(self, ip_address, max_requests=5, window_seconds=300):
        """
        Check if an IP address is rate limited.
        
        Args:
            ip_address: The IP address to check
            max_requests: Maximum requests allowed in the time window
            window_seconds: Time window in seconds
            
        Returns:
            tuple: (is_limited, remaining_requests, reset_time)
        """
        current_time = time.time()
        
        # Check if IP is temporarily blocked
        if ip_address in self.blocked_ips:
            if current_time < self.blocked_ips[ip_address]:
                reset_time = int(self.blocked_ips[ip_address] - current_time)
                return True, 0, reset_time
            else:
                # Block has expired, remove it
                del self.blocked_ips[ip_address]
        
        # Clean old requests outside the window
        request_times = self.requests[ip_address]
        cutoff_time = current_time - window_seconds
        
        while request_times and request_times[0] < cutoff_time:
            request_times.popleft()
        
        # Check rate limit
        current_requests = len(request_times)
        remaining = max(0, max_requests - current_requests)
        
        if current_requests >= max_requests:
            # Block IP for additional time (escalating block)
            block_duration = min(3600, 300 * (current_requests - max_requests + 1))  # Max 1 hour
            self.blocked_ips[ip_address] = current_time + block_duration
            
            # Only log if we have a current app context
            try:
                current_app.logger.warning(
                    f"Rate limit exceeded for IP {ip_address}. "
                    f"Blocked for {block_duration} seconds. "
                    f"Requests in window: {current_requests}/{max_requests}"
                )
            except RuntimeError:
                # No app context available, skip logging
                pass
            
            return True, 0, block_duration
        
        return False, remaining, int(window_seconds - (current_time - (request_times[0] if request_times else current_time)))
    
    def record_request(self, ip_address):
        """Record a request from an IP address."""
        current_time = time.time()
        self.requests[ip_address].append(current_time)
        
        # Limit memory usage by keeping only recent requests
        if len(self.requests[ip_address]) > 100:
            self.requests[ip_address] = deque(list(self.requests[ip_address])[-50:])


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_requests=5, window_seconds=300, block_duration=300):
    """
    Decorator to apply rate limiting to endpoints.
    
    Args:
        max_requests: Maximum requests allowed in the time window
        window_seconds: Time window in seconds
        block_duration: How long to block after rate limit exceeded
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Skip rate limiting during tests
            try:
                if current_app.config.get('TESTING', False):
                    return f(*args, **kwargs)
            except RuntimeError:
                # No app context available, proceed with rate limiting
                pass
            
            # Get client IP address (handle proxy headers)
            ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
            if ip_address and ',' in ip_address:
                ip_address = ip_address.split(',')[0].strip()
            if not ip_address:
                ip_address = 'unknown'
            
            # Check rate limit
            is_limited, remaining, reset_time = rate_limiter.is_rate_limited(
                ip_address, max_requests, window_seconds
            )
            
            if is_limited:
                try:
                    current_app.logger.warning(f"Rate limit exceeded for {f.__name__} from IP {ip_address}")
                except RuntimeError:
                    # No app context available, skip logging
                    pass
                
                from .utils import create_error_response
                
                # Create a more informative error message
                minutes = reset_time // 60
                seconds = reset_time % 60
                
                if minutes > 0:
                    retry_msg = f"Please try again in {minutes} minute{'s' if minutes != 1 else ''}"
                    if seconds > 0:
                        retry_msg += f" and {seconds} second{'s' if seconds != 1 else ''}"
                else:
                    retry_msg = f"Please try again in {seconds} second{'s' if seconds != 1 else ''}"
                
                response, status_code = create_error_response(
                    f"Too many requests. {retry_msg}.", 
                    429
                )
                
                # Add rate limiting headers
                response.headers['X-RateLimit-Limit'] = str(max_requests)
                response.headers['X-RateLimit-Remaining'] = '0'
                response.headers['X-RateLimit-Reset'] = str(int(time.time() + reset_time))
                response.headers['Retry-After'] = str(reset_time)
                
                return response, status_code
            
            # Record the request
            rate_limiter.record_request(ip_address)
            
            # Execute the original function
            result = f(*args, **kwargs)
            
            # Add rate limiting headers to successful responses
            if isinstance(result, tuple) and len(result) >= 2:
                response, status_code = result[0], result[1]
                if hasattr(response, 'headers'):
                    response.headers['X-RateLimit-Limit'] = str(max_requests)
                    response.headers['X-RateLimit-Remaining'] = str(remaining - 1)
                    response.headers['X-RateLimit-Reset'] = str(int(time.time() + reset_time))
            
            return result
            
        return decorated_function
    return decorator