# sdk/setup.py

from setuptools import setup, find_packages

setup(
    name="memorymint-sdk",
    version="0.1.0",
    description="Query any MemoryMint public brain with automatic X402 payments",
    author="MemoryMint",
    packages=find_packages(),
    install_requires=[
        "httpx>=0.27.0",
        "cdp-sdk>=0.0.1",
    ],
    extras_require={
        "dev": ["pytest"],
    },
    python_requires=">=3.10",
    long_description=open("README.md").read() if __import__("os").path.exists("README.md") else "",
)
