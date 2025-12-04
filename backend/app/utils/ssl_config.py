"""
SSL/TLS Configuration Utilities

Provides utilities for managing SSL certificates and creating SSL contexts
for HTTP clients (httpx, requests, etc.) to handle self-signed certificates
and custom CA certificates.
"""
import logging
import ssl
from typing import Optional, Union
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def get_ssl_context() -> Union[ssl.SSLContext, bool]:
    """
    Create SSL context based on application settings.
    
    Returns:
        - ssl.SSLContext: Custom SSL context with CA certs if SSL_CA_CERT_PATH is set
        - False: If SSL_VERIFY is False (disables SSL verification)
        - True: Default SSL verification (if SSL_VERIFY is True and no custom CA)
    
    Usage with httpx:
        async with httpx.AsyncClient(verify=get_ssl_context()) as client:
            response = await client.get(url)
    """
    # If SSL verification is disabled, return False
    if not settings.SSL_VERIFY:
        logger.warning("⚠️ SSL verification is DISABLED. This is not recommended for production!")
        return False
    
    # If custom CA certificate is provided, create custom SSL context
    if settings.SSL_CA_CERT_PATH:
        ca_cert_path = Path(settings.SSL_CA_CERT_PATH)
        
        if not ca_cert_path.is_file():
            logger.error(f"❌ SSL_CA_CERT_PATH specified but file not found: {ca_cert_path}")
            logger.warning("⚠️ Falling back to default SSL verification")
            return True
        
        try:
            # Create SSL context with custom CA certificate
            ssl_context = ssl.create_default_context(cafile=str(ca_cert_path))
            
            # Optionally add client certificate if provided
            if settings.SSL_CLIENT_CERT_PATH and settings.SSL_CLIENT_KEY_PATH:
                client_cert_path = Path(settings.SSL_CLIENT_CERT_PATH)
                client_key_path = Path(settings.SSL_CLIENT_KEY_PATH)
                
                if client_cert_path.is_file() and client_key_path.is_file():
                    ssl_context.load_cert_chain(
                        certfile=str(client_cert_path),
                        keyfile=str(client_key_path)
                    )
                    logger.info(f"✅ Loaded client certificate: {client_cert_path}")
                else:
                    logger.warning(f"⚠️ Client certificate or key not found")
            
            logger.info(f"✅ Using custom CA certificate: {ca_cert_path}")
            return ssl_context
            
        except Exception as e:
            logger.error(f"❌ Failed to load CA certificate: {e}")
            logger.warning("⚠️ Falling back to default SSL verification")
            return True
    
    # Default: use standard SSL verification
    return True


def get_httpx_client(**kwargs) -> httpx.AsyncClient:
    """
    Create httpx.AsyncClient with proper SSL configuration.
    
    Args:
        **kwargs: Additional arguments to pass to httpx.AsyncClient
        
    Returns:
        httpx.AsyncClient configured with SSL settings from app config
        
    Example:
        async with get_httpx_client(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
    """
    # Get SSL verification setting
    ssl_verify = get_ssl_context()
    
    # Merge with user-provided kwargs, but don't override 'verify' if explicitly set
    if 'verify' not in kwargs:
        kwargs['verify'] = ssl_verify
    
    return httpx.AsyncClient(**kwargs)


def get_sync_httpx_client(**kwargs) -> httpx.Client:
    """
    Create synchronous httpx.Client with proper SSL configuration.
    
    Args:
        **kwargs: Additional arguments to pass to httpx.Client
        
    Returns:
        httpx.Client configured with SSL settings from app config
        
    Example:
        with get_sync_httpx_client(timeout=30.0) as client:
            response = client.get(url, headers=headers)
    """
    # Get SSL verification setting
    ssl_verify = get_ssl_context()
    
    # Merge with user-provided kwargs
    if 'verify' not in kwargs:
        kwargs['verify'] = ssl_verify
    
    return httpx.Client(**kwargs)


def log_ssl_config():
    """Log current SSL configuration for debugging."""
    logger.info("=" * 60)
    logger.info("SSL/TLS Configuration:")
    logger.info(f"  SSL_VERIFY: {settings.SSL_VERIFY}")
    logger.info(f"  SSL_CA_CERT_PATH: {settings.SSL_CA_CERT_PATH or 'Not set (using system CA)'}")
    logger.info(f"  SSL_CLIENT_CERT_PATH: {settings.SSL_CLIENT_CERT_PATH or 'Not set'}")
    logger.info(f"  SSL_CLIENT_KEY_PATH: {settings.SSL_CLIENT_KEY_PATH or 'Not set'}")
    
    if not settings.SSL_VERIFY:
        logger.warning("  ⚠️ WARNING: SSL verification is DISABLED!")
        logger.warning("  ⚠️ This should ONLY be used in development environments!")
    
    logger.info("=" * 60)
